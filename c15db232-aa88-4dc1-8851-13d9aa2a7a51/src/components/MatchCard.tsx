import React from 'react';
import { motion } from 'framer-motion';
export type MatchData = {
  id: string;
  homeTeam: {
    name: string;
    logo: string;
    score: number;
  };
  awayTeam: {
    name: string;
    logo: string;
    score: number;
  };
  group: string;
  stage: string;
  stadium: string;
  isLive: boolean;
};
interface MatchCardProps {
  match: MatchData;
  index: number;
}
function WavyBorder() {
  return <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      {/* Smooth flowing wave border */}
      <path d="M 20,15 
           C 40,8 60,8 80,15 
           C 100,22 120,22 140,15 
           C 160,8 180,8 200,15 
           C 220,22 240,22 260,15 
           C 280,8 300,8 320,15 
           C 340,22 360,22 380,15
           
           L 385,30
           C 392,50 392,70 385,90
           C 378,110 378,130 385,150
           C 392,170 392,190 385,210
           C 378,230 378,250 385,270
           L 385,285
           
           L 380,285
           C 360,278 340,278 320,285
           C 300,292 280,292 260,285
           C 240,278 220,278 200,285
           C 180,292 160,292 140,285
           C 120,278 100,278 80,285
           C 60,292 40,292 20,285
           
           L 15,270
           C 8,250 8,230 15,210
           C 22,190 22,170 15,150
           C 8,130 8,110 15,90
           C 22,70 22,50 15,30
           Z" stroke="#3d9a5e" strokeWidth="1.5" fill="none" opacity="0.25" strokeLinecap="round" />

      {/* Inner subtle wave for depth */}
      <path d="M 30,25 
           C 50,20 70,20 90,25 
           C 110,30 130,30 150,25 
           C 170,20 190,20 210,25 
           C 230,30 250,30 270,25 
           C 290,20 310,20 330,25 
           C 350,30 370,30 370,25
           
           L 375,40
           C 380,60 380,80 375,100
           C 370,120 370,140 375,160
           C 380,180 380,200 375,220
           C 370,240 370,260 375,275
           
           L 370,275
           C 350,270 330,270 310,275
           C 290,280 270,280 250,275
           C 230,270 210,270 190,275
           C 170,280 150,280 130,275
           C 110,270 90,270 70,275
           C 50,280 30,280 30,275
           
           L 25,260
           C 20,240 20,220 25,200
           C 30,180 30,160 25,140
           C 20,120 20,100 25,80
           C 30,60 30,40 25,40
           Z" stroke="#2d7a3e" strokeWidth="1" fill="none" opacity="0.15" strokeLinecap="round" />
    </svg>;
}
export function MatchCard({
  match,
  index
}: MatchCardProps) {
  return <motion.div initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    delay: index * 0.1,
    duration: 0.5
  }} className="relative py-8 px-4">
      {/* Wavy Border Container */}
      <div className="relative bg-white rounded-3xl p-6 shadow-sm overflow-hidden">
        <WavyBorder />

        {/* Enhanced Live Badge */}
        {match.isLive && <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
            <motion.div initial={{
          scale: 0.8,
          opacity: 0
        }} animate={{
          scale: 1,
          opacity: 1
        }} transition={{
          type: 'spring',
          stiffness: 200,
          damping: 10
        }} className="relative">
              {/* Glow effect */}
              <motion.div animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5]
          }} transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }} className="absolute inset-0 bg-red-500 rounded-full blur-lg" />

              {/* Main badge */}
              <div className="relative bg-black text-white text-sm font-bold px-5 py-2 rounded-full flex items-center gap-2.5 shadow-2xl border-2 border-red-500/20">
                {/* Animated dot with multiple layers */}
                <div className="relative flex items-center justify-center">
                  {/* Outer pulse ring */}
                  <motion.div animate={{
                scale: [1, 1.8, 1],
                opacity: [0.8, 0, 0.8]
              }} transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeOut'
              }} className="absolute w-3 h-3 rounded-full bg-red-500" />

                  {/* Middle pulse ring */}
                  <motion.div animate={{
                scale: [1, 1.4, 1],
                opacity: [0.6, 0, 0.6]
              }} transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeOut',
                delay: 0.2
              }} className="absolute w-3 h-3 rounded-full bg-red-400" />

                  {/* Core dot */}
                  <motion.div animate={{
                scale: [1, 1.1, 1],
                opacity: [1, 0.9, 1]
              }} transition={{
                duration: 1,
                repeat: Infinity,
                ease: 'easeInOut'
              }} className="relative w-2.5 h-2.5 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
                </div>

                <span className="tracking-wide">Live</span>
              </div>
            </motion.div>
          </div>}

        <div className="flex items-center justify-between relative z-[1]">
          {/* Home Team */}
          <div className="flex flex-col items-center w-1/3">
            <div className="w-16 h-16 rounded-full bg-white p-2 shadow-sm mb-3 flex items-center justify-center">
              <img src={match.homeTeam.logo} alt={match.homeTeam.name} className="w-full h-full object-contain" />
            </div>
            <span className="text-sm font-semibold text-gray-900 text-center leading-tight">
              {match.homeTeam.name}
            </span>
          </div>

          {/* Score & Info */}
          <div className="flex flex-col items-center justify-center w-1/3">
            <div className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
              {match.homeTeam.score}-{match.awayTeam.score}
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                {match.group}
              </span>
              <span className="text-[10px] text-gray-400 font-medium">
                {match.stage}
              </span>
            </div>
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center w-1/3">
            <div className="w-16 h-16 rounded-full bg-white p-2 shadow-sm mb-3 flex items-center justify-center">
              <img src={match.awayTeam.logo} alt={match.awayTeam.name} className="w-full h-full object-contain" />
            </div>
            <span className="text-sm font-semibold text-gray-900 text-center leading-tight">
              {match.awayTeam.name}
            </span>
          </div>
        </div>

        {/* Stadium */}
        <div className="mt-4 text-center relative z-[1]">
          <span className="text-[10px] text-gray-400 font-medium">
            {match.stadium}
          </span>
        </div>
      </div>
    </motion.div>;
}
export function WavyDivider() {
  return <div className="w-full h-6 overflow-hidden text-[#e5e1d8]">
      <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full fill-current">
        <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="opacity-0"></path>
        <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25" className="hidden"></path>
        <path d="M0,60c150,0,150,20,300,20s150-20,300-20,150,20,300,20,150-20,300-20v10h-1200z" className="fill-[#dcd8cf]"></path>
      </svg>
    </div>;
}