import React from 'react';
import { Header } from '../components/Header';
import { DateSelector } from '../components/DateSelector';
import { MatchCard, MatchData, WavyDivider } from '../components/MatchCard';
import { motion } from 'framer-motion';
// Mock Data
const matches: MatchData[] = [{
  id: '1',
  homeTeam: {
    name: 'Chelsea',
    logo: 'https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg',
    score: 0
  },
  awayTeam: {
    name: 'PSG',
    logo: 'https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg',
    score: 2
  },
  group: 'Group A',
  stage: 'Group Stage',
  stadium: 'Mestalla Stadium',
  isLive: true
}, {
  id: '2',
  homeTeam: {
    name: 'RB Salzburg',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/7/77/FC_Red_Bull_Salzburg_logo.svg/1200px-FC_Red_Bull_Salzburg_logo.svg.png',
    score: 0
  },
  awayTeam: {
    name: 'Real Madrid',
    logo: 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg',
    score: 3
  },
  group: 'Group H',
  stage: 'Group Stage',
  stadium: 'Lincoln Financial Field',
  isLive: true
}, {
  id: '3',
  homeTeam: {
    name: 'PSG',
    logo: 'https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg',
    score: 2
  },
  awayTeam: {
    name: 'Bayern',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg',
    score: 1
  },
  group: 'Group A',
  stage: 'Group Stage',
  stadium: 'Allianz Arena',
  isLive: true
}];
export function ScoresPage() {
  return <div className="min-h-screen w-full bg-gradient-to-b from-[#2d7a3e] to-[#1a5c2a] relative overflow-hidden font-sans">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <svg width="100%" height="100%">
          <pattern id="grass" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M0 40L40 0H20L0 20M40 40V20L20 40" fill="white" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grass)" />
        </svg>
      </div>

      <div className="relative z-10 max-w-md mx-auto h-full flex flex-col min-h-screen">
        {/* Status Bar Placeholder (for visual fidelity to design) */}
        <div className="h-6 w-full" />

        <Header />

        <div className="px-6 pt-2 pb-4">
          <motion.h1 initial={{
          opacity: 0,
          x: -20
        }} animate={{
          opacity: 1,
          x: 0
        }} className="text-3xl font-bold text-white tracking-tight">
            Scores & Fixtures
          </motion.h1>
        </div>

        <DateSelector />

        {/* Live Now Section */}
        <motion.div initial={{
        y: 100,
        opacity: 0
      }} animate={{
        y: 0,
        opacity: 1
      }} transition={{
        type: 'spring',
        damping: 20,
        stiffness: 100
      }} className="flex-1 bg-[#f5f1e8] rounded-t-[40px] mt-4 px-6 pt-8 pb-12 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Live Now</h2>
            <button className="text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors uppercase tracking-wider">
              See More
            </button>
          </div>

          <div className="space-y-0">
            {matches.map((match, index) => <div key={match.id}>
                <MatchCard match={match} index={index} />
                {index < matches.length - 1 && <div className="py-4">
                    <WavyDivider />
                  </div>}
              </div>)}
          </div>
        </motion.div>
      </div>
    </div>;
}