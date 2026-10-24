import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'node:http';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { Chess } from 'chess.js';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.warn('WARNING: Set JWT_SECRET to a random secret at least 32 characters long.');
}
const secret = JWT_SECRET || 'development-only-secret-change-before-launch-123456';
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json({ limit: '100kb' }));

type AuthUser = { id:string; username:string; email:string; rating:number; gamesPlayed:number };
function signToken(user:AuthUser){return jwt.sign({sub:user.id},secret,{expiresIn:'7d'});}
function publicUser(u:any):AuthUser{return {id:u.id,username:u.username,email:u.email,rating:u.rating,gamesPlayed:u.gamesPlayed};}
function auth(req:any,res:any,next:any){
  const header=req.headers.authorization as string|undefined;
  if(!header?.startsWith('Bearer ')){return res.status(401).json({message:'Sign in required'});}
  try{const payload=jwt.verify(header.slice(7),secret) as jwt.JwtPayload;req.userId=payload.sub;next();}
  catch{return res.status(401).json({message:'Session expired; sign in again'});}
}
app.get('/health',(_req,res)=>res.json({ok:true,service:'openchess-api'}));
app.post('/api/auth/register',async(req,res)=>{
  const schema=z.object({username:z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_-]+$/),email:z.string().email().max(254),password:z.string().min(8).max(128)});
  const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({message:'Use a 3–24 character username, valid email, and password of at least 8 characters.'});
  const {username,email,password}=parsed.data;
  try{
    const existing=await prisma.user.findFirst({where:{OR:[{username:{equals:username,mode:'insensitive'}},{email:{equals:email,mode:'insensitive'}}]}});
    if(existing)return res.status(409).json({message:'That username or email is already registered.'});
    const user=await prisma.user.create({data:{username,email:email.toLowerCase(),passwordHash:await bcrypt.hash(password,12)}});
    const u=publicUser(user);res.status(201).json({user:u,token:signToken(u)});
  }catch(e){console.error(e);res.status(500).json({message:'Could not create account. Check database configuration.'});}
});
app.post('/api/auth/login',async(req,res)=>{
  const parsed=z.object({email:z.string().email(),password:z.string().min(1)}).safeParse(req.body);
  if(!parsed.success)return res.status(400).json({message:'Enter a valid email and password.'});
  try{const user=await prisma.user.findFirst({where:{email:{equals:parsed.data.email,mode:'insensitive'}}});
    if(!user||!(await bcrypt.compare(parsed.data.password,user.passwordHash)))return res.status(401).json({message:'Incorrect email or password.'});
    const u=publicUser(user);res.json({user:u,token:signToken(u)});
  }catch(e){console.error(e);res.status(500).json({message:'Login unavailable. Check database configuration.'});}
});
app.get('/api/me',auth,async(req:any,res)=>{
  const user=await prisma.user.findUnique({where:{id:req.userId}});
  if(!user)return res.status(404).json({message:'Account not found'});
  res.json({user:publicUser(user)});
});
app.get('/api/games/mine',auth,async(req:any,res)=>{
  const games=await prisma.game.findMany({where:{OR:[{whiteId:req.userId},{blackId:req.userId}],status:'finished'},include:{white:{select:{id:true,username:true,rating:true}},black:{select:{id:true,username:true,rating:true}}},orderBy:{createdAt:'desc'},take:100});
  res.json({games:games.map(g=>({id:g.id,result:g.whiteId===req.userId?g.result:invertResult(g.result),ratingChange:g.whiteId===req.userId?g.whiteRatingChange:g.blackRatingChange,createdAt:g.createdAt,opponent:g.whiteId===req.userId?g.black:g.white,pgn:g.pgn}))});
});
function invertResult(result:string|null){return result==='1-0'?'0-1':result==='0-1'?'1-0':result;}
const io = new Server(server,{cors:{origin:allowedOrigin,methods:['GET','POST']}});
type Player = {id:string;username:string;rating:number};
type LiveGame = {id:string;chess:Chess;white:Player;black:Player;moves:string[];sockets:Map<string,string>;finished:boolean};
const games=new Map<string,LiveGame>();
const waiting:string[]=[];
const socketUsers=new Map<string,Player>();
io.use(async(socket,next)=>{
  try{
    const token=String(socket.handshake.auth?.token||'');
    const payload=jwt.verify(token,secret) as jwt.JwtPayload;
    const user=await prisma.user.findUnique({where:{id:String(payload.sub)}});
    if(!user)return next(new Error('Account not found'));
    socket.data.player={id:user.id,username:user.username,rating:user.rating} as Player;next();
  }catch{next(new Error('Sign in to play online'));}
});
function finishGame(g:LiveGame,result:string){
  if(g.finished)return;g.finished=true;
  const expectedWhite=1/(1+Math.pow(10,(g.black.rating-g.white.rating)/400));
  const scoreWhite=result==='1-0'?1:result==='0-1'?0:0.5;
  const kWhite=40,kBlack=40;
  const deltaWhite=Math.round(kWhite*(scoreWhite-expectedWhite));
  const deltaBlack=Math.round(kBlack*((1-scoreWhite)-(1-expectedWhite)));
  const pgn=g.chess.pgn();const fen=g.chess.fen();
  void prisma.$transaction(async(tx)=>{
    await tx.game.update({where:{id:g.id},data:{status:'finished',result,pgn,finalFen:fen,finishedAt:new Date(),whiteRatingChange:deltaWhite,blackRatingChange:deltaBlack}});
    await tx.user.update({where:{id:g.white.id},data:{rating:{increment:deltaWhite},gamesPlayed:{increment:1}}});
    await tx.user.update({where:{id:g.black.id},data:{rating:{increment:deltaBlack},gamesPlayed:{increment:1}}});
  }).catch(e=>console.error('Failed to persist completed game',e));
  for(const sid of g.sockets.keys())io.to(sid).emit('game:over',{result,fen,moves:g.moves,whiteRatingChange:deltaWhite,blackRatingChange:deltaBlack});
  setTimeout(()=>games.delete(g.id),60_000);
}
io.on('connection',socket=>{
  const player=socket.data.player as Player;socketUsers.set(socket.id,player);
  socket.on('matchmaking:join',async()=>{
    if(waiting.includes(socket.id)||[...games.values()].some(g=>g.sockets.has(socket.id)))return;
    while(waiting.length){
      const otherId=waiting.shift()!;if(otherId===socket.id)continue;
      const opponent=socketUsers.get(otherId);if(!opponent)continue;
      const white=Math.random()<0.5?player:opponent,black=white.id===player.id?opponent:player;
      const whiteSocket=white.id===player.id?socket.id:otherId,blackSocket=black.id===player.id?socket.id:otherId;
      const id=`game_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      const g:LiveGame={id,chess:new Chess(),white,black,moves:[],sockets:new Map([[whiteSocket,'w'],[blackSocket,'b']]),finished:false};
      games.set(id,g);
      try{await prisma.game.create({data:{id,whiteId:white.id,blackId:black.id,whiteRatingBefore:white.rating,blackRatingBefore:black.rating}});}
      catch(e){console.error(e);games.delete(id);io.to(socket.id).emit('game:error',{message:'Could not create game record. Check database.'});io.to(otherId).emit('game:error',{message:'Could not create game record. Check database.'});continue;}
      io.to(whiteSocket).emit('game:start',{gameId:id,color:'w',fen:g.chess.fen(),moves:[]});
      io.to(blackSocket).emit('game:start',{gameId:id,color:'b',fen:g.chess.fen(),moves:[]});
      break;
    }
    if(![...games.values()].some(g=>g.sockets.has(socket.id))){waiting.push(socket.id);socket.emit('game:waiting');}
  });
  socket.on('game:move',({gameId,from,to,promotion}:any={})=>{
    const g=games.get(String(gameId));if(!g||g.finished){socket.emit('game:error',{message:'Game is no longer active.'});return;}
    const color=g.sockets.get(socket.id);if(!color||g.chess.turn()!==color){socket.emit('game:error',{message:'It is not your turn.'});return;}
    try{
      const move=g.chess.move({from:String(from),to:String(to),promotion:promotion==='n'||promotion==='r'||promotion==='b'||promotion==='q'?promotion:'q'});
      g.moves.push(move.san);
      for(const sid of g.sockets.keys())io.to(sid).emit('game:state',{fen:g.chess.fen(),moves:g.moves,lastMove:move.san});
      if(g.chess.isCheckmate())finishGame(g,g.chess.turn()==='w'?'0-1':'1-0');
      else if(g.chess.isDraw()||g.chess.isStalemate()||g.chess.isThreefoldRepetition()||g.chess.isInsufficientMaterial())finishGame(g,'1/2-1/2');
    }catch{socket.emit('game:error',{message:'Illegal move rejected by server.'});}
  });
  socket.on('disconnect',()=>{
    socketUsers.delete(socket.id);
    const idx=waiting.indexOf(socket.id);if(idx>=0)waiting.splice(idx,1);
    for(const g of games.values())if(g.sockets.has(socket.id)&&!g.finished){
      const other=[...g.sockets.keys()].find(sid=>sid!==socket.id);
      if(other)io.to(other).emit('game:error',{message:'Opponent disconnected. Reconnection support is not implemented yet.'});
    }
  });
});
server.listen(PORT,()=>console.log(`OpenChess API listening on ${PORT}`));
