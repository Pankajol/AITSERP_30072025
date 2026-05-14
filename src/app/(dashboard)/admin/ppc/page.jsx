"use client"
import React from 'react';
import {
  Cog,
  Users,
  Wrench,
  CalendarDays,
  FileOutput,
  GitMerge,
  ClipboardList
} from 'lucide-react';

const cardSections = [
  {
    title: 'Production Orders',
    href: '/production-orders',
    description: 'Create, view, and manage all production orders.',
    icon: ClipboardList,
    color: 'text-blue-500'
  },
  {
    title: 'Machines',
    href: '/machines',
    description: 'Manage all machinery and equipment.',
    icon: Cog,
    color: 'text-teal-500'
  },
  {
    title: 'Operators',
    href: '/operators',
    description: 'Manage production operators and their details.',
    icon: Users,
    color: 'text-orange-500'
  },
  {
    title: 'Resources',
    href: '/resources',
    description: 'Manage other production resources like tools.',
    icon: Wrench,
    color: 'text-purple-500'
  },
  {
    title: 'Machine Outputs',
    href: '/machine-outputs',
    description: 'Define item output rates and costs per machine.',
    icon: FileOutput,
    color: 'text-red-500'
  },
  {
    title: 'Operator Mappings',
    href: '/operator-machine-mappings',
    description: 'Assign operators to specific machines.',
    icon: GitMerge,
    color: 'text-yellow-500'
  },
  {
    title: 'Holidays',
    href: '/holidays',
    description: 'Manage the holiday calendar for planning.',
    icon: CalendarDays,
    color: 'text-indigo-500'
  }
];

const DashboardPage = () => {
  return (
    <div className="p-8 font-sans bg-gray-50 min-h-screen">
      <header className="mb-10">
        <h1 className="text-4xl font-bold text-gray-800">Production Planning Dashboard</h1>
        <p className="text-lg text-gray-600 mt-2">Welcome! Select a module to begin.</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {cardSections.map((section) => (
          <a href={section.href} key={section.title} className="text-current no-underline">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex items-start gap-4 h-full">
              <div className={`p-3 bg-gray-100 rounded-full ${section.color}`}>
                <section.icon size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-1">{section.title}</h2>
                <p className="text-gray-600">{section.description}</p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default DashboardPage;