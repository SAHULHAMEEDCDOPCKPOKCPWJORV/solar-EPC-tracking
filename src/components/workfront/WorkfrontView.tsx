import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Block, WorkfrontCheckItem, ReadinessStatus } from '../../types';
import { formatIndianDate } from '../../services/dateUtils';
import {
  ShieldAlert,
  Layers,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Clock,
  Plus,
  User,
  Calendar,
  FileText,
  Wrench,
  Truck,
  HardHat,
  Package,
  X,
  Check,
  ChevronRight,
  Filter
} from 'lucide-react';

export const WorkfrontView: React.FC = () => {
  const {
    currentProject,
    updateBlock,
    addBlock,
    deleteBlock,
    updateReadinessCheck,
    addReadinessCheck,
    showNotification
  } = useProject();

  const [selectedBlockId, setSelectedBlockId] = useState<string>(
    currentProject?.blocks[0]?.id || ''
  );
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  useEffect(() => {
    if (currentProject && !currentProject.blocks.some(b => b.id === selectedBlockId)) {
      setSelectedBlockId(currentProject.blocks[0]?.id || '');
    }
  }, [currentProject]);

  // New Block Modal State
  const [showAddBlockModal, setShowAddBlockModal] = useState(false);
  const [newBlockName, setNewBlockName] = useState('');
  const [newBlockZone, setNewBlockZone] = useState('');
  const [newBlockCapacity, setNewBlockCapacity] = useState(12.5);
  const [newBlockArea, setNewBlockArea] = useState(50);
  const [newBlockOwner, setNewBlockOwner] = useState('Er. K. Ramesh');

  // New Check Item Modal State
  const [showAddCheckModal, setShowAddCheckModal] = useState(false);
  const [newCheckTitle, setNewCheckTitle] = useState('');
  const [newCheckCategory, setNewCheckCategory] = useState<WorkfrontCheckItem['category']>('SITE');
  const [newCheckMandatory, setNewCheckMandatory] = useState(true);
  const [newCheckOwner, setNewCheckOwner] = useState('');
  const [newCheckDate, setNewCheckDate] = useState('');
  const [newCheckReason, setNewCheckReason] = useState('');

  if (!currentProject) {
    return (
      <div className="flex-1 p-8 text-center text-slate-400">
        No project selected.
      </div>
    );
  }

  const activeBlock = currentProject.blocks.find(b => b.id === selectedBlockId) || currentProject.blocks[0];

  const getCategoryIcon = (category: WorkfrontCheckItem['category']) => {
    switch (category) {
      case 'SITE': return <Layers className="w-3.5 h-3.5 text-cyan-400" />;
      case 'DRAWING': return <FileText className="w-3.5 h-3.5 text-blue-400" />;
      case 'INSPECTION': return <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />;
      case 'MANPOWER': return <User className="w-3.5 h-3.5 text-indigo-400" />;
      case 'EQUIPMENT': return <Wrench className="w-3.5 h-3.5 text-orange-400" />;
      case 'SAFETY': return <HardHat className="w-3.5 h-3.5 text-emerald-400" />;
      case 'MATERIAL': return <Package className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  const getStatusBadge = (status: ReadinessStatus) => {
    switch (status) {
      case 'READY':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-950 text-blue-400 border border-blue-800/60">READY TO EXECUTE</span>;
      case 'BLOCKED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-950 text-rose-400 border border-rose-800/60 flex items-center gap-1"><AlertOctagon className="w-3 h-3" /> BLOCKED</span>;
      case 'AT_RISK':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-solar-amber/20 text-solar-amber border border-solar-amber/40 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> AT RISK</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60">COMPLETED</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-950 text-cyan-400 border border-cyan-800/60">IN PROGRESS</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300">NOT STARTED</span>;
    }
  };

  const handleCreateBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockName.trim()) return;

    addBlock({
      name: newBlockName,
      zoneCode: newBlockZone || `ZONE-${currentProject.blocks.length + 1}`,
      capacityMWp: Number(newBlockCapacity) || 0,
      areaAcres: Number(newBlockArea) || 0,
      plannedProgress: 0,
      actualProgress: 0,
      status: 'NOT_STARTED',
      relatedActivityIds: [],
      responsiblePerson: newBlockOwner || 'Site Incharge',
      readinessChecks: [
        {
          id: `RC-${Date.now()}-1`,
          title: 'Site Topography, Boundary Marking & Grading Clearance',
          category: 'SITE',
          isMandatory: true,
          isSatisfied: false,
          status: 'PENDING',
          responsiblePerson: newBlockOwner,
          targetResolutionDate: new Date().toISOString().split('T')[0]
        },
        {
          id: `RC-${Date.now()}-2`,
          title: 'Approved GFC Array Layout & MMS Piling Drawing',
          category: 'DRAWING',
          isMandatory: true,
          isSatisfied: false,
          status: 'PENDING',
          responsiblePerson: 'Lead Design Engineer',
          targetResolutionDate: new Date().toISOString().split('T')[0]
        },
        {
          id: `RC-${Date.now()}-3`,
          title: 'Daily Permit to Work (PTW) & Safety Induction Completed',
          category: 'SAFETY',
          isMandatory: true,
          isSatisfied: false,
          status: 'PENDING',
          responsiblePerson: 'HSE Officer',
          targetResolutionDate: new Date().toISOString().split('T')[0]
        }
      ]
    });

    setShowAddBlockModal(false);
    setNewBlockName('');
  };

  const handleCreateCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBlock || !newCheckTitle.trim()) return;

    addReadinessCheck(activeBlock.id, {
      title: newCheckTitle,
      category: newCheckCategory,
      isMandatory: newCheckMandatory,
      isSatisfied: false,
      status: newCheckReason ? 'BLOCKED' : 'PENDING',
      blockingReason: newCheckReason || undefined,
      responsiblePerson: newCheckOwner || activeBlock.responsiblePerson,
      targetResolutionDate: newCheckDate || new Date().toISOString().split('T')[0]
    });

    setShowAddCheckModal(false);
    setNewCheckTitle('');
    setNewCheckReason('');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-graphite-950 overflow-hidden">
      {/* Top Header */}
      <div className="bg-graphite-900 border-b border-graphite-750 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Workfront Readiness & Constraint Prevention</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Evaluate prerequisite clearances before commencing physical erection to avoid idle site machinery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddBlockModal(true)}
            className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-graphite-950 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Block / Zone</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Block Cards List */}
        <div className="w-80 border-r border-graphite-750 bg-graphite-900/60 p-4 overflow-y-auto space-y-3 shrink-0">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 px-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Project Workfronts</span>
            <span>{currentProject.blocks.length} Blocks</span>
          </div>

          {currentProject.blocks.map(block => {
            const isSelected = activeBlock?.id === block.id;
            const blockedItems = block.readinessChecks.filter(c => c.status === 'BLOCKED').length;
            const pendingItems = block.readinessChecks.filter(c => c.status === 'PENDING').length;

            return (
              <div
                key={block.id}
                onClick={() => setSelectedBlockId(block.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-graphite-850 border-cyan-500/60 shadow-lg shadow-cyan-500/10'
                    : 'bg-graphite-900 border-graphite-750/80 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono font-bold text-slate-400">{block.zoneCode}</span>
                  {getStatusBadge(block.status)}
                </div>

                <h3 className="text-xs font-bold text-slate-100 truncate mb-1">{block.name}</h3>
                <p className="text-[11px] text-slate-400">
                  {block.capacityMWp} MWp • {block.areaAcres} Acres
                </p>

                {/* Progress bars */}
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">Physical Progress:</span>
                    <span className="font-mono text-cyan-400 font-bold">{block.actualProgress}%</span>
                  </div>
                  <div className="w-full bg-graphite-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-cyan-400 h-full rounded-full"
                      style={{ width: `${block.actualProgress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Roadblock warning pill */}
                {blockedItems > 0 && (
                  <div className="mt-2.5 px-2 py-1 rounded bg-rose-950/60 border border-rose-800/50 flex items-center justify-between text-[10px] text-rose-300 font-semibold">
                    <span className="flex items-center gap-1">
                      <AlertOctagon className="w-3 h-3 text-rose-400" />
                      <span>{blockedItems} Prerequisite{blockedItems > 1 ? 's' : ''} Blocked</span>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Pane: Selected Block Detailed Readiness Matrix */}
        {activeBlock ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Block Header Banner */}
            <div className="p-5 rounded-2xl bg-graphite-900 border border-graphite-750 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                    {activeBlock.id}
                  </span>
                  <span className="text-xs text-slate-400">{activeBlock.zoneCode}</span>
                  {getStatusBadge(activeBlock.status)}
                </div>
                <h2 className="text-xl font-bold text-white">{activeBlock.name}</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Responsible Incharge: <span className="text-slate-200 font-medium">{activeBlock.responsiblePerson}</span>
                  {activeBlock.targetResolutionDate && (
                    <span className="ml-3">Target Ready: <span className="text-cyan-300 font-mono">{formatIndianDate(activeBlock.targetResolutionDate)}</span></span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAddCheckModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-graphite-800 hover:bg-graphite-750 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Prerequisite Check</span>
                </button>
              </div>
            </div>

            {/* Crucial Readiness Rule Warning Banner */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/40 to-graphite-900 border border-amber-800/40 text-xs text-amber-200 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-solar-amber shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Workfront Readiness Separation Rule:</span> Physical installation progress ({activeBlock.actualProgress}%) is independent of statutory/safety clearance. If any mandatory prerequisite (such as CEIG inspection, GFC drawing, or daily PTW) is blocked, the workfront is flagged as <span className="text-rose-400 font-bold">BLOCKED</span> to prevent unauthorized work.
              </div>
            </div>

            {/* Prerequisites Checklist Filter & Table */}
            <div className="bg-graphite-900 border border-graphite-750 rounded-2xl shadow-xl overflow-hidden">
              <div className="p-4 border-b border-graphite-750 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Mandatory Readiness Checklist</h3>
                  <span className="text-xs text-slate-400 font-mono">
                    ({activeBlock.readinessChecks.filter(c => c.isSatisfied).length}/{activeBlock.readinessChecks.length} Cleared)
                  </span>
                </div>

                {/* Category Filter */}
                <div className="flex items-center gap-2 text-xs">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="bg-graphite-850 border border-graphite-700 rounded-lg p-1.5 text-slate-200 text-xs focus:outline-none"
                  >
                    <option value="ALL">All Categories</option>
                    <option value="SITE">Site Topo / Grading</option>
                    <option value="DRAWING">Approved GFC Drawings</option>
                    <option value="INSPECTION">Inspection / CEIG / TPI</option>
                    <option value="MANPOWER">Manpower Induction</option>
                    <option value="EQUIPMENT">Machinery & Rigs</option>
                    <option value="SAFETY">Safety PTW / HSE</option>
                    <option value="MATERIAL">BoS Materials / Cabling</option>
                  </select>
                </div>
              </div>

              {/* Checks Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-graphite-850 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-graphite-750">
                    <tr>
                      <th className="py-3 px-4">Prerequisite Description</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3 text-center">Mandatory</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Responsible Owner</th>
                      <th className="py-3 px-3">Target Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-graphite-800">
                    {activeBlock.readinessChecks
                      .filter(c => filterCategory === 'ALL' || c.category === filterCategory)
                      .map(check => (
                        <tr
                          key={check.id}
                          className={`hover:bg-graphite-850/50 transition-colors ${
                            check.status === 'BLOCKED' ? 'bg-rose-950/20' : ''
                          }`}
                        >
                          {/* Title & Blocking Reason */}
                          <td className="py-3 px-4 max-w-sm">
                            <div className="font-semibold text-slate-200">{check.title}</div>
                            {check.blockingReason && (
                              <div className="text-[11px] text-rose-400 bg-rose-950/50 border border-rose-900/60 rounded p-1.5 mt-1.5 flex items-start gap-1.5">
                                <AlertOctagon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-500" />
                                <div>
                                  <span className="font-bold">Blocking Constraint: </span>
                                  {check.blockingReason}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Category */}
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1.5 text-slate-300 font-medium">
                              {getCategoryIcon(check.category)}
                              <span className="text-[11px]">{check.category}</span>
                            </span>
                          </td>

                          {/* Mandatory */}
                          <td className="py-3 px-3 text-center">
                            {check.isMandatory ? (
                              <span className="text-[10px] font-bold text-rose-400 bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-800/40">
                                MANDATORY
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Optional</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3">
                            <select
                              value={check.status}
                              onChange={(e) => {
                                const newStatus = e.target.value as any;
                                updateReadinessCheck(activeBlock.id, check.id, {
                                  status: newStatus,
                                  isSatisfied: newStatus === 'CLEARED'
                                });
                              }}
                              className={`text-xs font-bold rounded-lg px-2 py-1 border focus:outline-none ${
                                check.status === 'CLEARED'
                                  ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                                  : check.status === 'BLOCKED'
                                  ? 'bg-rose-950 text-rose-400 border-rose-800'
                                  : check.status === 'WAIVED'
                                  ? 'bg-slate-800 text-slate-300 border-slate-700'
                                  : 'bg-solar-amber/20 text-solar-amber border-solar-amber/40'
                              }`}
                            >
                              <option value="CLEARED">CLEARED</option>
                              <option value="PENDING">PENDING</option>
                              <option value="BLOCKED">BLOCKED</option>
                              <option value="WAIVED">WAIVED</option>
                            </select>
                          </td>

                          {/* Responsible */}
                          <td className="py-3 px-3 text-slate-300 font-medium">
                            {check.responsiblePerson}
                          </td>

                          {/* Target Date */}
                          <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                            {formatIndianDate(check.targetResolutionDate)}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            {check.status === 'BLOCKED' ? (
                              <button
                                onClick={() => {
                                  updateReadinessCheck(activeBlock.id, check.id, {
                                    status: 'CLEARED',
                                    isSatisfied: true,
                                    blockingReason: undefined
                                  });
                                  showNotification(`Cleared constraint: ${check.title}`, 'success');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold"
                              >
                                Clear Roadblock
                              </button>
                            ) : check.status !== 'CLEARED' ? (
                              <button
                                onClick={() => {
                                  const reason = prompt('Specify blocking constraint reason:', 'Pending client site clearance');
                                  if (reason) {
                                    updateReadinessCheck(activeBlock.id, check.id, {
                                      status: 'BLOCKED',
                                      blockingReason: reason
                                    });
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold"
                              >
                                Flag Blocked
                              </button>
                            ) : (
                              <span className="text-[10px] text-emerald-400 font-mono">
                                Cleared {formatIndianDate(check.clearedDate)}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            Select or create a workfront block.
          </div>
        )}
      </div>

      {/* Modal: Create Block */}
      {showAddBlockModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-graphite-900 border border-graphite-750 w-full max-w-md rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-graphite-750">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Create New Block / Work Area</span>
              </h3>
              <button onClick={() => setShowAddBlockModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBlock} className="space-y-4 py-4 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                  Block / Zone Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Block 5 (12.5 MWp - Central Zone)"
                  value={newBlockName}
                  onChange={(e) => setNewBlockName(e.target.value)}
                  className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                    Zone Identifier
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ZONE-E"
                    value={newBlockZone}
                    onChange={(e) => setNewBlockZone(e.target.value)}
                    className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                    DC Capacity (MWp)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newBlockCapacity}
                    onChange={(e) => setNewBlockCapacity(parseFloat(e.target.value) || 0)}
                    className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                    Area (Acres)
                  </label>
                  <input
                    type="number"
                    value={newBlockArea}
                    onChange={(e) => setNewBlockArea(parseFloat(e.target.value) || 0)}
                    className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                    Block Incharge
                  </label>
                  <input
                    type="text"
                    value={newBlockOwner}
                    onChange={(e) => setNewBlockOwner(e.target.value)}
                    className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-graphite-750">
                <button
                  type="button"
                  onClick={() => setShowAddBlockModal(false)}
                  className="px-4 py-2 rounded-xl bg-graphite-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-graphite-950 font-bold"
                >
                  Create Workfront
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Prerequisite Check */}
      {showAddCheckModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-graphite-900 border border-graphite-750 w-full max-w-md rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-graphite-750">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-cyan-400" />
                <span>Add Prerequisite Check</span>
              </h3>
              <button onClick={() => setShowAddCheckModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCheck} className="space-y-4 py-4 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                  Prerequisite Check Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CEIG Clearance for 33kV Switchgear panels"
                  value={newCheckTitle}
                  onChange={(e) => setNewCheckTitle(e.target.value)}
                  className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                    Prerequisite Category
                  </label>
                  <select
                    value={newCheckCategory}
                    onChange={(e) => setNewCheckCategory(e.target.value as any)}
                    className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100"
                  >
                    <option value="SITE">SITE (Civil/Grading)</option>
                    <option value="DRAWING">DRAWING (Approved GFC)</option>
                    <option value="INSPECTION">INSPECTION (CEIG/TPI)</option>
                    <option value="MANPOWER">MANPOWER (Labour gang)</option>
                    <option value="EQUIPMENT">EQUIPMENT (Rigs/Cranes)</option>
                    <option value="SAFETY">SAFETY (PTW/HSE)</option>
                    <option value="MATERIAL">MATERIAL (BoS/Cables)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                    Mandatory Flag
                  </label>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newCheckMandatory}
                      onChange={(e) => setNewCheckMandatory(e.target.checked)}
                      className="rounded border-graphite-700 text-cyan-500 focus:ring-0"
                    />
                    <span className="text-slate-300 font-semibold">Mandatory for Workfront</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                    Responsible Owner
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. P. Vignesh (Design Lead)"
                    value={newCheckOwner}
                    onChange={(e) => setNewCheckOwner(e.target.value)}
                    className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                    Target Resolution Date
                  </label>
                  <input
                    type="date"
                    value={newCheckDate}
                    onChange={(e) => setNewCheckDate(e.target.value)}
                    className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                  Active Roadblock / Constraint Reason (if currently blocked)
                </label>
                <textarea
                  rows={2}
                  placeholder="Leave empty if not currently blocked"
                  value={newCheckReason}
                  onChange={(e) => setNewCheckReason(e.target.value)}
                  className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 placeholder:text-slate-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-graphite-750">
                <button
                  type="button"
                  onClick={() => setShowAddCheckModal(false)}
                  className="px-4 py-2 rounded-xl bg-graphite-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-graphite-950 font-bold"
                >
                  Add Prerequisite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
