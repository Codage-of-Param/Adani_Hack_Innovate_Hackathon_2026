import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Truck, Factory, MapPin, Settings, Menu, X, DollarSign, Package, Clock, Filter, Plus, Trash2, Check, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet marker icon issue
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIconRetina,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface Plant {
  id: string;
  name: string;
  production: number;
  stock: number;
  capacity: number;
  status: string;
  latitude: number;
  longitude: number;
  code: string;
}

interface GrindingUnit {
  id: string;
  name: string;
  demand: number;
  location: string;
  priority: string;
  stock: number;
  latitude: number;
  longitude: number;
  code: string;
}

interface Allocation {
  id: number;
  plantId: string;
  unitId: string;
  quantity: number;
  cost: number;
  mode: string;
  distance: number;
  transitTime: number;
  status: string;
  date: string;
  period: number;
}

interface NewAllocation {
  plantId: string;
  unitId: string;
  quantity: number;
  mode: string;
}

interface AlertItem {
  id: string;
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  time: string;
  icon: React.ElementType;
}

interface KPICardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  unit: string;
  trend?: number;
  alert?: boolean;
  darkMode: boolean;
  cardBg: string;
  borderClass: string;
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1
  }
};

const KPICard = ({ icon: Icon, label, value, unit, trend, alert, darkMode, cardBg, borderClass }: KPICardProps) => (
  <motion.div
    variants={itemVariants}
    whileHover={{ y: -5, scale: 1.02, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
    whileTap={{ scale: 0.98 }}
    className={`${cardBg} rounded-lg p-6 border ${borderClass} shadow-sm transition-colors cursor-default`}
  >
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
        <Icon className="w-6 h-6 text-indigo-600 dark:text-indigo-300" />
      </div>
      {alert && <AlertTriangle className="w-5 h-5 text-orange-500" />}
    </div>
    <p className={`text-sm ${darkMode ? 'text-zinc-400' : 'text-zinc-700'} mb-1`}>{label}</p>
    <p className="text-2xl font-bold mb-2">{value.toLocaleString()}{unit}</p>
    {trend !== undefined && (
      <div className="flex items-center gap-1">
        {trend > 0 ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />}
        <span className={`text-xs ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>{Math.abs(trend)}% vs last month</span>
      </div>
    )}
  </motion.div>
);

const ClinkerAllocationSystem = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [allocationView, setAllocationView] = useState('auto');
  const [filterPlant, setFilterPlant] = useState('all');
  const [filterUnit, setFilterUnit] = useState('all');
  const [filterMode, setFilterMode] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [newAllocation, setNewAllocation] = useState<NewAllocation>({ plantId: '1', unitId: '1', quantity: 0, mode: 'T1' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  const [plants] = useState<Plant[]>([
    { id: '1', name: 'IU_002 Plant', production: 4500000, stock: 4200000, capacity: 5000000, status: 'Operational', latitude: 20, longitude: 70, code: 'IU_002' },
    { id: '2', name: 'IU_003 Plant', production: 4500000, stock: 4200000, capacity: 5000000, status: 'Operational', latitude: 21, longitude: 71, code: 'IU_003' },
    { id: '3', name: 'IU_004 Plant', production: 4500000, stock: 4200000, capacity: 5000000, status: 'Operational', latitude: 22, longitude: 72, code: 'IU_004' },
    { id: '4', name: 'IU_005 Plant', production: 4500000, stock: 4200000, capacity: 5000000, status: 'Operational', latitude: 23, longitude: 73, code: 'IU_005' },
    { id: '5', name: 'IU_006 Plant', production: 4500000, stock: 4200000, capacity: 5000000, status: 'Operational', latitude: 24, longitude: 74, code: 'IU_006' },
    { id: '6', name: 'IU_007 Plant', production: 4500000, stock: 4200000, capacity: 5000000, status: 'Operational', latitude: 25, longitude: 75, code: 'IU_007' },
    { id: '7', name: 'IU_008 Plant', production: 4500000, stock: 4200000, capacity: 5000000, status: 'Operational', latitude: 26, longitude: 76, code: 'IU_008' },
    { id: '8', name: 'IU_009 Plant', production: 4500000, stock: 4200000, capacity: 5000000, status: 'Operational', latitude: 27, longitude: 77, code: 'IU_009' },
    { id: '9', name: 'IU_010 Plant', production: 4500000, stock: 4200000, capacity: 5000000, status: 'Operational', latitude: 28, longitude: 78, code: 'IU_010' },
    { id: '10', name: 'IU_011 Plant', production: 4500000, stock: 4200000, capacity: 5000000, status: 'Operational', latitude: 29, longitude: 79, code: 'IU_011' },
    { id: '11', name: 'EXT_001 Plant', production: 4500000, stock: 4200000, capacity: 5000000, status: 'Operational', latitude: 20, longitude: 70, code: 'EXT_001' },
    { id: '12', name: 'EXT_002 Plant', production: 4500000, stock: 4200000, capacity: 5000000, status: 'Operational', latitude: 21, longitude: 71, code: 'EXT_002' },
    { id: '13', name: 'IU_013 Plant', production: 4500000, stock: 4200000, capacity: 5000000, status: 'Operational', latitude: 22, longitude: 72, code: 'IU_013' },
    { id: '14', name: 'IU_015 Plant', production: 4500000, stock: 4200000, capacity: 5000000, status: 'Operational', latitude: 23, longitude: 73, code: 'IU_015' },
    { id: '15', name: 'IU_016 Plant', production: 4500000, stock: 4200000, capacity: 5000000, status: 'Operational', latitude: 24, longitude: 74, code: 'IU_016' },
    { id: '16', name: 'IU_017 Plant', production: 4500000, stock: 4200000, capacity: 5000000, status: 'Operational', latitude: 25, longitude: 75, code: 'IU_017' },
    { id: '17', name: 'IU_019 Plant', production: 4500000, stock: 4200000, capacity: 5000000, status: 'Operational', latitude: 26, longitude: 76, code: 'IU_019' },
    { id: '18', name: 'IU_020 Plant', production: 4500000, stock: 4200000, capacity: 5000000, status: 'Operational', latitude: 27, longitude: 77, code: 'IU_020' },
    { id: '19', name: 'IU_021 Plant', production: 4500000, stock: 4200000, capacity: 5000000, status: 'Operational', latitude: 28, longitude: 78, code: 'IU_021' },
  ]);

  const [grindingUnits] = useState<GrindingUnit[]>([
    { id: '1', name: 'GU_009 Unit', demand: 2000, location: 'India', priority: 'High', stock: 1800, latitude: 25, longitude: 75, code: 'GU_009' },
    { id: '2', name: 'GU_023 Unit', demand: 2000, location: 'India', priority: 'High', stock: 1800, latitude: 26, longitude: 76, code: 'GU_023' },
    { id: '3', name: 'GU_002 Unit', demand: 2000, location: 'India', priority: 'High', stock: 1800, latitude: 27, longitude: 77, code: 'GU_002' },
    { id: '4', name: 'GU_020 Unit', demand: 2000, location: 'India', priority: 'High', stock: 1800, latitude: 28, longitude: 78, code: 'GU_020' },
    { id: '5', name: 'GU_013 Unit', demand: 2000, location: 'India', priority: 'High', stock: 1800, latitude: 29, longitude: 79, code: 'GU_013' },
    { id: '6', name: 'GU_022 Unit', demand: 2000, location: 'India', priority: 'High', stock: 1800, latitude: 30, longitude: 80, code: 'GU_022' },
    { id: '7', name: 'GU_005 Unit', demand: 2000, location: 'India', priority: 'High', stock: 1800, latitude: 31, longitude: 81, code: 'GU_005' },
    { id: '8', name: 'GU_010 Unit', demand: 2000, location: 'India', priority: 'High', stock: 1800, latitude: 32, longitude: 82, code: 'GU_010' },
    { id: '9', name: 'GU_019 Unit', demand: 2000, location: 'India', priority: 'High', stock: 1800, latitude: 33, longitude: 83, code: 'GU_019' },
    { id: '10', name: 'GU_001 Unit', demand: 2000, location: 'India', priority: 'High', stock: 1800, latitude: 34, longitude: 84, code: 'GU_001' },
    { id: '11', name: 'GU_015 Unit', demand: 2000, location: 'India', priority: 'High', stock: 1800, latitude: 25, longitude: 75, code: 'GU_015' },
    { id: '12', name: 'GU_012 Unit', demand: 2000, location: 'India', priority: 'High', stock: 1800, latitude: 26, longitude: 76, code: 'GU_012' },
    { id: '13', name: 'GU_008 Unit', demand: 2000, location: 'India', priority: 'High', stock: 1800, latitude: 27, longitude: 77, code: 'GU_008' },
    { id: '14', name: 'GU_006 Unit', demand: 2000, location: 'India', priority: 'High', stock: 1800, latitude: 28, longitude: 78, code: 'GU_006' },
    { id: '15', name: 'GU_021 Unit', demand: 2000, location: 'India', priority: 'High', stock: 1800, latitude: 29, longitude: 79, code: 'GU_021' },
    { id: '16', name: 'GU_007 Unit', demand: 2000, location: 'India', priority: 'High', stock: 1800, latitude: 30, longitude: 80, code: 'GU_007' },
    { id: '17', name: 'GU_011 Unit', demand: 2000, location: 'India', priority: 'High', stock: 1800, latitude: 31, longitude: 81, code: 'GU_011' },
    { id: '18', name: 'GU_018 Unit', demand: 2000, location: 'India', priority: 'High', stock: 1800, latitude: 32, longitude: 82, code: 'GU_018' },
    { id: '19', name: 'GU_024 Unit', demand: 2000, location: 'India', priority: 'High', stock: 1800, latitude: 33, longitude: 83, code: 'GU_024' },
    { id: '20', name: 'GU_016 Unit', demand: 2000, location: 'India', priority: 'High', stock: 1800, latitude: 34, longitude: 84, code: 'GU_016' },
    { id: '21', name: 'GU_014 Unit', demand: 2000, location: 'India', priority: 'High', stock: 1800, latitude: 25, longitude: 75, code: 'GU_014' },
  ]);

  const [allocations, setAllocations] = useState<Allocation[]>([
    { id: 1, plantId: '1', unitId: '1', quantity: 1000, cost: 8450, mode: 'T1', distance: 650, transitTime: 48, status: 'Active', date: '2024-01-20', period: 1 },
    { id: 2, plantId: '2', unitId: '2', quantity: 850, cost: 12200, mode: 'T1', distance: 840, transitTime: 56, status: 'Active', date: '2024-01-20', period: 1 },
    { id: 3, plantId: '3', unitId: '3', quantity: 400, cost: 5800, mode: 'T2', distance: 320, transitTime: 28, status: 'Pending', date: '2024-01-20', period: 1 }
  ]);

  const [kpis, setKpis] = useState({
    totalProduction: 12450,
    allocatedClinker: 2250,
    availableStock: 2610,
    transportCost: 26450,
    onTimeDelivery: 94.2,
    delayedShipments: 1
  });

  useEffect(() => {
    const totalProd = plants.reduce((sum, p) => sum + p.production, 0);
    const allocated = allocations.reduce((sum, a) => sum + a.quantity, 0);
    const totalStock = plants.reduce((sum, p) => sum + p.stock, 0);
    const totalCost = allocations.reduce((sum, a) => sum + a.cost, 0);

    setKpis({
      totalProduction: totalProd,
      allocatedClinker: allocated,
      availableStock: totalStock - allocated,
      transportCost: totalCost,
      onTimeDelivery: 94.2,
      delayedShipments: allocations.filter(a => a.status === 'Delayed').length
    });

    // Generate Dynamic Alerts
    const newAlerts: AlertItem[] = [];

    // 1. Critical Inventory Alerts
    plants.forEach(p => {
      const stockLevel = (p.stock / p.capacity) * 100;
      if (stockLevel < 20) {
        newAlerts.push({
          id: `inv-${p.code}`,
          title: `Low Stock: ${p.code}`,
          message: `${p.name} stock level is at ${Math.round(stockLevel)}%. Consider increasing production.`,
          severity: 'critical',
          time: 'Just now',
          icon: AlertTriangle
        });
      }
    });

    // 2. Grinding Unit Stock Alerts
    grindingUnits.forEach(u => {
      if (u.stock < u.demand * 0.5) {
        newAlerts.push({
          id: `unit-${u.code}`,
          title: `Unit Demand Risk: ${u.code}`,
          message: `${u.name} stock is critically low compared to demand.`,
          severity: 'warning',
          time: 'Just now',
          icon: Package
        });
      }
    });

    // 3. Delayed Shipment Alerts
    const delayed = allocations.filter(a => a.status === 'Delayed');
    if (delayed.length > 0) {
      newAlerts.push({
        id: 'delayed-shipments',
        title: 'Logistics Delay',
        message: `There are ${delayed.length} delayed shipments requiring attention.`,
        severity: 'warning',
        time: 'Just now',
        icon: Truck
      });
    }

    // 4. Optimization Notice
    if (activeTab === 'dashboard' && !error) {
      newAlerts.push({
        id: 'opt-info',
        title: 'System Optimal',
        message: 'Clinker allocation is synchronized with current production peaks.',
        severity: 'info',
        time: 'Stable',
        icon: TrendingUp
      });
    }

    setAlerts(newAlerts);
  }, [plants, allocations, grindingUnits, activeTab, error]);

  const fetchBackendData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('https://clinker-backend.onrender.com/data/Optimization_Results.xlsx');
      if (!response.ok) throw new Error('Failed to fetch backend data');
      const result = await response.json();

      // Map backend data to frontend allocations
      const mappedData = result.data.map((item: any, index: number) => {
        // Find plant and unit by code
        const plant = plants.find(p => p.code === item.From) || plants[0];
        const unit = grindingUnits.find(u => u.code === item.To) || grindingUnits[0];

        const distance = calculateDistance(plant.latitude, plant.longitude, unit.latitude, unit.longitude);
        const modes: Record<string, number> = { 'T1': 10, 'T2': 7 };
        const mode = item.Mode || 'T1';
        const costPerUnit = modes[mode] || 10;
        const cost = Math.round((distance * (item.Quantity || 0) * costPerUnit) / 100);

        const speeds: Record<string, number> = { 'T1': 55, 'T2': 45 };
        const speed = speeds[mode] || 50;
        const transitTime = Math.round((distance / speed) * 24);

        return {
          id: index + 100, // Offset for new IDs
          plantId: plant.id,
          unitId: unit.id,
          quantity: item.Quantity || 0,
          cost: isNaN(cost) ? 0 : cost,
          mode: mode,
          distance: distance,
          transitTime: isNaN(transitTime) ? 0 : transitTime,
          status: item.Status || (item.Period === 1 ? 'Active' : 'Pending'),
          date: new Date().toISOString().split('T')[0],
          period: item.Period || 1
        };
      });

      if (mappedData.length > 0) {
        setAllocations(mappedData);
      }
    } catch (err: any) {
      if (err.message.includes('404')) {
        setError('Optimization results not found. Click "Run Solver" to generate them.');
      } else {
        setError(err.message);
      }
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBackendData();
  }, []);

  const handleRunOptimization = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://clinker-backend.onrender.com/optimize', { method: 'POST' });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to start optimization');
      }

      // Wait for 10 seconds for the solver to finish, keeping the loader active
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Refresh data after wait
      await fetchBackendData();
    } catch (err: any) {
      setError(err.message);
      alert('Error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const getPlantName = (plantId: string) => plants.find(p => p.id === plantId)?.name || 'Unknown';
  const getUnitName = (unitId: string) => grindingUnits.find(u => u.id === unitId)?.name || 'Unknown';

  const filteredAllocations = allocations.filter(a => {
    if (filterPlant !== 'all' && a.plantId !== filterPlant) return false;
    if (filterUnit !== 'all' && a.unitId !== filterUnit) return false;
    if (filterMode !== 'all' && a.mode !== filterMode) return false;
    return true;
  });

  const handleAddAllocation = async () => {
    if (newAllocation.quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    const plant = plants.find(p => p.id === newAllocation.plantId);
    const unit = grindingUnits.find(u => u.id === newAllocation.unitId);

    if (!plant || !unit) {
      alert('Invalid plant or unit selection');
      return;
    }

    setIsLoading(true);
    try {
      const distance = calculateDistance(plant.latitude, plant.longitude, unit.latitude, unit.longitude);
      const modes: Record<string, number> = { 'T1': 10, 'T2': 7 };
      const costPerUnit = modes[newAllocation.mode] || 10;
      const cost = Math.round((distance * newAllocation.quantity * costPerUnit) / 100);
      const speeds: Record<string, number> = { 'T1': 55, 'T2': 45 };
      const speed = speeds[newAllocation.mode] || 50;
      const transitTime = Math.round((distance / speed) * 24);

      // Save to Excel via Backend
      const saveResponse = await fetch('https://clinker-backend.onrender.com/save-allocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_code: plant.code,
          to_code: unit.code,
          mode: newAllocation.mode,
          quantity: newAllocation.quantity,
          period: 1, // Default to first period
          trips: 1    // Default to 1 trip
        })
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save allocation to Excel');
      }

      const allocation = {
        id: Math.max(...allocations.map(a => a.id), 0) + 1,
        plantId: newAllocation.plantId,
        unitId: newAllocation.unitId,
        quantity: newAllocation.quantity,
        cost: cost,
        mode: newAllocation.mode,
        distance: distance,
        transitTime: transitTime,
        status: 'Pending',
        date: new Date().toISOString().split('T')[0],
        period: 1
      };

      setAllocations([...allocations, allocation]);
      setShowAddModal(false);
      setNewAllocation({ plantId: '1', unitId: '1', quantity: 0, mode: 'Road' });
      alert('Allocation saved permanently to Excel!');
    } catch (err: any) {
      alert('Error saving allocation: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAllocation = (id: number) => {
    setAllocations(allocations.filter(a => a.id !== id));
  };

  const handleConfirmAllocation = async (id: number) => {
    const alloc = allocations.find(a => a.id === id);
    if (!alloc) return;

    const plant = plants.find(p => p.id === alloc.plantId);
    const unit = grindingUnits.find(u => u.id === alloc.unitId);
    if (!plant || !unit) return;

    setIsLoading(true);
    try {
      const response = await fetch('https://clinker-backend.onrender.com/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_code: plant.code,
          to_code: unit.code,
          mode: alloc.mode,
          period: alloc.period,
          new_status: 'Success'
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to update status on server');
      }

      setAllocations(prev => prev.map(a => a.id === id ? { ...a, status: 'Success' } : a));
    } catch (err: any) {
      setError(err.message);
      alert('Error updating status: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const allocationByPlant = plants.map(p => {
    const allocated = allocations.filter(a => a.plantId === p.id).reduce((sum, a) => sum + a.quantity, 0);
    return { plant: p.name, allocated, unallocated: p.stock - allocated, cost: allocations.filter(a => a.plantId === p.id).reduce((sum, a) => sum + a.cost, 0) };
  });

  const costTrendData = [
    { month: 'Jan', cost: 15000 },
    { month: 'Feb', cost: 18000 },
    { month: 'Mar', cost: 22000 },
    { month: 'Apr', cost: kpis.transportCost }
  ];

  const deliveryData = [
    { name: 'On-Time', value: kpis.onTimeDelivery, color: '#10b981' },
    { name: 'Delayed', value: 100 - kpis.onTimeDelivery, color: '#ef4444' }
  ];

  const demandFulfillment = grindingUnits.map(u => {
    const allocated = allocations.filter(a => a.unitId === u.id).reduce((sum, a) => sum + a.quantity, 0);
    return { name: u.code, demand: u.demand, allocated, percentage: Math.min(100, Math.round((allocated / (u.demand || 1)) * 100)) };
  });

  const modeEfficiency = ['T1', 'T2'].map(mode => {
    const modeAllocations = allocations.filter(a => a.mode === mode);
    const totalQty = modeAllocations.reduce((sum, a) => sum + a.quantity, 0);
    const totalCost = modeAllocations.reduce((sum, a) => sum + a.cost, 0);
    return { mode, costPerMT: totalQty > 0 ? Math.round(totalCost / totalQty) : 0 };
  });

  const bgClass = darkMode ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-900';
  const cardBg = darkMode ? 'bg-zinc-800' : 'bg-white';
  const borderClass = darkMode ? 'border-zinc-700' : 'border-zinc-200';
  const inputBg = darkMode ? 'bg-zinc-700 border-zinc-600' : 'bg-white border-zinc-300';

  // KPICardProps moved outside

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  // itemVariants moved outside

  // KPICard moved outside

  interface GraphContainerProps {
    title: string;
    children: React.ReactNode;
    darkMode: boolean;
    cardBg: string;
    borderClass: string;
    className?: string;
    variants?: any;
  }

  const GraphContainer = ({ title, children, cardBg, borderClass, className, variants }: GraphContainerProps) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
      <>
        {isExpanded && <div className={className || "h-[380px] w-full"} />}
        <motion.div
          layout
          variants={variants}
          onClick={() => setIsExpanded(!isExpanded)}
          className={isExpanded ? 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4' : `relative z-0 ${className || 'h-[380px]'}`}
        >
          <motion.div
            layout
            className={`${cardBg} rounded-xl border ${borderClass} shadow-xl overflow-hidden cursor-pointer w-full transition-colors`}
            style={{
              maxWidth: isExpanded ? '1200px' : '100%',
              height: isExpanded ? '80vh' : '100%',
              perspective: '1000px'
            }}
            animate={isExpanded ? {
              rotateX: 5,
              rotateY: 0,
              scale: 1,
              zIndex: 100
            } : {
              rotateX: 0,
              rotateY: 0,
              scale: 1,
              zIndex: 1
            }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <div className={`p-6 flex flex-col h-full ${isExpanded ? 'gap-6' : 'gap-4'}`}>
              <div className="flex justify-between items-center shrink-0">
                <h3 className={`font-bold transition-all ${isExpanded ? 'text-3xl' : 'text-lg'}`}>{title}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider opacity-50">{isExpanded ? 'Interactive 3D Mode' : 'Click to Expand'}</span>
                  {isExpanded ? <X className="w-5 h-5" /> : <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />}
                </div>
              </div>
              <div className="flex-1 w-full min-h-0 relative">
                {/* 3D-effect content container */}
                <motion.div
                  className="absolute inset-0"
                  animate={isExpanded ? {
                    rotateX: 0,
                    z: 50
                  } : { z: 0 }}
                >
                  {children}
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </>
    );
  };

  const AllocationTable = () => (
    <motion.div
      variants={itemVariants}
      className={`${cardBg} rounded-lg p-6 border ${borderClass} shadow-sm`}
    >
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-semibold text-lg">Clinker Allocation & Planning</h3>
        <div className="flex gap-2">
          <button
            onClick={handleRunOptimization}
            disabled={isLoading}
            className={`flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Settings className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Run Solver
          </button>
          <button onClick={() => setShowFilters(!showFilters)} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 rounded-lg">
          <select value={filterPlant} onChange={(e) => setFilterPlant(e.target.value)} className={`p-2 border ${inputBg} rounded-lg text-sm`}>
            <option value="all">All Plants</option>
            {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filterUnit} onChange={(e) => setFilterUnit(e.target.value)} className={`p-2 border ${inputBg} rounded-lg text-sm`}>
            <option value="all">All Units</option>
            {grindingUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select value={filterMode} onChange={(e) => setFilterMode(e.target.value)} className={`p-2 border ${inputBg} rounded-lg text-sm`}>
            <option value="all">All Modes</option>
            <option value="T1">T1 (Regular)</option>
            <option value="T2">T2 (Express)</option>
          </select>
        </div>
      )}

      <div className="flex gap-4 mb-6">
        <button onClick={() => setAllocationView('auto')} className={`px-4 py-2 rounded-lg font-medium transition text-sm ${allocationView === 'auto' ? 'bg-indigo-600 text-white' : `${cardBg} border ${borderClass}`}`}>
          Auto-Suggest
        </button>
        <button onClick={() => setAllocationView('manual')} className={`px-4 py-2 rounded-lg font-medium transition text-sm ${allocationView === 'manual' ? 'bg-indigo-600 text-white' : `${cardBg} border ${borderClass}`}`}>
          Manual Allocation
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className={`border-b ${borderClass}`}>
            <tr>
              <th className="text-left py-3 px-4">Plant to Unit</th>
              <th className="text-left py-3 px-4">Distance</th>
              <th className="text-left py-3 px-4">Est. Cost</th>
              <th className="text-left py-3 px-4">Transit Time</th>
              <th className="text-left py-3 px-4">Qty (MT)</th>
              <th className="text-left py-3 px-4">Mode</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-left py-3 px-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredAllocations.map((alloc) => (
              <tr key={alloc.id} className={`border-b ${borderClass} hover:${darkMode ? 'bg-slate-700' : 'bg-blue-50'} transition`}>
                <td className="py-3 px-4 font-medium text-xs">{getPlantName(alloc.plantId)} → {getUnitName(alloc.unitId)}</td>
                <td className="py-3 px-4">{alloc.distance}km</td>
                <td className="py-3 px-4">${alloc.cost.toLocaleString()}</td>
                <td className="py-3 px-4">{alloc.transitTime}h</td>
                <td className="py-3 px-4">{alloc.quantity}</td>
                <td className="py-3 px-4"><span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded text-xs font-medium">{alloc.mode}</span></td>
                <td className="py-3 px-4"><span className={`px-2 py-1 rounded text-xs font-medium ${alloc.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : alloc.status === 'Success' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>{alloc.status}</span></td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    {alloc.status === 'Pending' && (
                      <button onClick={() => handleConfirmAllocation(alloc.id)} className="p-1 hover:bg-green-100 dark:hover:bg-green-900 rounded" title="Confirm">
                        <Package className="w-4 h-4 text-green-600" />
                      </button>
                    )}
                    <button onClick={() => handleDeleteAllocation(alloc.id)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded" title="Delete">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={() => setShowAddModal(true)} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition flex items-center gap-2 text-sm">
        <Plus className="w-4 h-4" /> Add Allocation
      </button>
    </motion.div>
  );

  const AddAllocationModal = () => (
    <>
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${cardBg} rounded-2xl p-8 max-w-md w-full border ${borderClass} shadow-2xl animation-none`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl">Add New Collection</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-2 opacity-70">From Plant</label>
                <select
                  value={newAllocation.plantId}
                  onChange={(e) => setNewAllocation({ ...newAllocation, plantId: e.target.value })}
                  className={`w-full p-3 border ${inputBg} rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm`}
                >
                  {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 opacity-70">To Grinding Unit</label>
                <select
                  value={newAllocation.unitId}
                  onChange={(e) => setNewAllocation({ ...newAllocation, unitId: e.target.value })}
                  className={`w-full p-3 border ${inputBg} rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm`}
                >
                  {grindingUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 opacity-70">Quantity (MT)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={newAllocation.quantity}
                    onChange={(e) => setNewAllocation({ ...newAllocation, quantity: parseFloat(e.target.value) || 0 })}
                    onFocus={(e) => e.target.select()}
                    className={`w-full p-3 border ${inputBg} rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm`}
                    placeholder="Enter quantity"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-500">MT</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 opacity-70">Transport Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  {['T1', 'T2'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setNewAllocation({ ...newAllocation, mode })}
                      className={`py-3 px-4 rounded-xl text-sm font-bold border transition-all ${newAllocation.mode === mode
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none'
                        : `${inputBg} border-zinc-200 dark:border-zinc-700 hover:border-indigo-400`
                        }`}
                    >
                      {mode} {mode === 'T1' ? '(Regular)' : '(Express)'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setShowAddModal(false)}
                  className={`flex-1 px-4 py-3 rounded-xl font-bold border ${borderClass} hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-sm`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddAllocation}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" /> Save Allocation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className={`${bgClass} h-screen flex flex-col overflow-hidden transition-colors`}>
      <header className={`${cardBg} border-b ${borderClass} h-[73px] shrink-0 z-40 shadow-sm sticky top-0`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </motion.button>
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <Factory className="w-7 h-7 text-indigo-600 group-hover:scale-110 transition-transform" />
              <div>
                <h1 className="text-2xl font-bold">ClinkerFlow</h1>
                <p className={`text-xs ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>Supply Chain Management</p>
              </div>
            </motion.div>
          </div>
          <motion.button
            whileHover={{ rotate: 180, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 200 }}
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-transform"
          >
            {darkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-indigo-600" />}
          </motion.button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.nav
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 256, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className={`${cardBg} border-r ${borderClass} p-6 h-full overflow-y-auto shrink-0 z-30`}
            >
              <div className="w-48">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
                  { id: 'plantsunits', label: 'Plants & Units', icon: '🏭' },
                  { id: 'allocations', label: 'Allocations', icon: '📦' },
                  { id: 'transportation', label: 'Transportation', icon: '🚚' },
                  { id: 'analytics', label: 'Analytics', icon: '📈' },
                  { id: 'alerts', label: 'Alerts', icon: '⚠️' }
                ].map((item) => (
                  <motion.button
                    key={item.id}
                    whileHover={{ scale: 1.05, originX: 0, backgroundColor: darkMode ? 'rgba(79, 70, 229, 0.2)' : 'rgba(79, 70, 229, 0.1)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveTab(item.id)}
                    className={`group w-full text-left py-3 px-4 rounded-xl mb-2 font-semibold transition-all flex items-center gap-3 text-sm ${activeTab === item.id ? 'bg-indigo-50 dark:bg-white/5 text-indigo-600 dark:text-indigo-400 translate-x-2' : 'text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                  >
                    <span className={`text-lg transition-transform ${activeTab === item.id ? 'scale-110' : 'grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100'}`}>{item.icon}</span> {item.label}
                  </motion.button>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>

        <main className="flex-1 p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && (
                <motion.div variants={containerVariants} initial="hidden" animate="visible">
                  <motion.div variants={itemVariants} className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                      <h2 className="text-3xl font-bold">Dashboard Overview</h2>
                      {isLoading && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-medium border border-indigo-100 dark:border-indigo-800">
                          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></div>
                          Fetching Real-time Data...
                        </div>
                      )}
                    </div>
                    <span className={`text-sm ${darkMode ? 'text-zinc-400' : 'text-zinc-700'}`}>Last updated: {new Date().toLocaleDateString()}</span>
                  </motion.div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg flex items-center gap-3 text-sm"
                    >
                      <AlertTriangle className="w-5 h-5" />
                      <div>
                        <p className="font-bold">Backend Connection Error</p>
                        <p className="opacity-80">{error}</p>
                      </div>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <KPICard icon={Package} label="Total Production" value={kpis.totalProduction} unit=" MT" trend={8} darkMode={darkMode} cardBg={cardBg} borderClass={borderClass} />
                    <KPICard icon={Package} label="Allocated Clinker" value={kpis.allocatedClinker} unit=" MT" trend={5} darkMode={darkMode} cardBg={cardBg} borderClass={borderClass} />
                    <KPICard icon={Package} label="Available Stock" value={kpis.availableStock} unit=" MT" alert={kpis.availableStock < 500} darkMode={darkMode} cardBg={cardBg} borderClass={borderClass} />
                    <KPICard icon={DollarSign} label="Transport Cost" value={kpis.transportCost} unit="" trend={-3} darkMode={darkMode} cardBg={cardBg} borderClass={borderClass} />
                    <KPICard icon={Clock} label="On-Time Delivery" value={kpis.onTimeDelivery} unit="%" trend={2} darkMode={darkMode} cardBg={cardBg} borderClass={borderClass} />
                    <KPICard icon={AlertTriangle} label="Delayed Shipments" value={kpis.delayedShipments} unit="" alert trend={0} darkMode={darkMode} cardBg={cardBg} borderClass={borderClass} />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <GraphContainer title="Allocation by Plant" darkMode={darkMode} cardBg={cardBg} borderClass={borderClass}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={allocationByPlant}>
                          <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} vertical={false} />
                          <XAxis dataKey="plant" stroke={darkMode ? '#71717a' : '#52525b'} axisLine={false} tickLine={false} />
                          <YAxis stroke={darkMode ? '#71717a' : '#52525b'} axisLine={false} tickLine={false} />
                          <Tooltip
                            cursor={{ fill: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                            contentStyle={{ backgroundColor: darkMode ? '#18181b' : '#fff', border: `1px solid ${darkMode ? '#3f3f46' : '#e4e4e7'}`, borderRadius: '0.5rem' }}
                          />
                          <Legend />
                          <Bar dataKey="allocated" name="Allocated" fill="#4f46e5" radius={[4, 4, 0, 0]} stackId="a" />
                          <Bar dataKey="unallocated" name="Remaining Stock" fill={darkMode ? '#3f3f46' : '#e4e4e7'} radius={[4, 4, 0, 0]} stackId="a" />
                        </BarChart>
                      </ResponsiveContainer>
                    </GraphContainer>

                    <GraphContainer title="Delivery Performance" darkMode={darkMode} cardBg={cardBg} borderClass={borderClass}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={deliveryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {deliveryData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: darkMode ? '#18181b' : '#fff', borderRadius: '0.5rem', border: 'none' }} />
                          <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                      </ResponsiveContainer>
                    </GraphContainer>

                    <div className="lg:col-span-2">
                      <GraphContainer title="Transportation Cost Trend" darkMode={darkMode} cardBg={cardBg} borderClass={borderClass}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={costTrendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} vertical={false} />
                            <XAxis dataKey="month" stroke={darkMode ? '#71717a' : '#52525b'} axisLine={false} tickLine={false} />
                            <YAxis stroke={darkMode ? '#71717a' : '#52525b'} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: darkMode ? '#18181b' : '#fff', border: `1px solid ${darkMode ? '#3f3f46' : '#e4e4e7'}`, borderRadius: '0.5rem' }} />
                            <Line type="monotone" dataKey="cost" stroke="#4f46e5" strokeWidth={4} dot={{ fill: '#4f46e5', r: 6, strokeWidth: 2, stroke: bgClass }} activeDot={{ r: 8 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </GraphContainer>
                    </div>
                  </div>

                  <AllocationTable />
                </motion.div>
              )}

              {activeTab === 'plantsunits' && (
                <motion.div variants={containerVariants} initial="hidden" animate="visible">
                  <motion.h2 variants={itemVariants} className="text-3xl font-bold mb-8">Plants and Grinding Units</motion.h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <motion.div variants={itemVariants} className={`${cardBg} rounded-lg p-6 border ${borderClass} shadow-sm`}>
                      <h3 className="font-semibold text-lg mb-4">Cement Plants</h3>
                      <div className="space-y-4">
                        {plants.map((plant) => (
                          <motion.div
                            key={plant.id}
                            whileHover={{ scale: 1.01 }}
                            className={`p-4 border ${borderClass} rounded-lg hover:shadow-md cursor-pointer transition-shadow`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-sm">{plant.name}</h4>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${plant.status === 'Operational' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>{plant.status}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                              <div><span className={darkMode ? 'text-zinc-400' : 'text-zinc-600'}>Production:</span> <strong>{plant.production} MT</strong></div>
                              <div><span className={darkMode ? 'text-zinc-400' : 'text-zinc-600'}>Stock:</span> <strong>{plant.stock} MT</strong></div>
                            </div>
                            <div className="flex h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(plant.stock / plant.capacity) * 100}%` }}
                                className="bg-gradient-to-r from-indigo-500 to-indigo-600"
                              ></motion.div>
                            </div>
                            <span className="text-xs mt-2 inline-block">{Math.round((plant.stock / plant.capacity) * 100)}% of {plant.capacity} MT capacity</span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className={`${cardBg} rounded-lg p-6 border ${borderClass} shadow-sm`}>
                      <h3 className="font-semibold text-lg mb-4">Grinding Units</h3>
                      <div className="space-y-4">
                        {grindingUnits.map((unit) => (
                          <motion.div
                            key={unit.id}
                            whileHover={{ scale: 1.01 }}
                            className={`p-4 border ${borderClass} rounded-lg hover:shadow-md cursor-pointer transition-shadow`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-sm">{unit.name}</h4>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${unit.priority === 'High' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : unit.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>{unit.priority}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                              <div><span className={darkMode ? 'text-zinc-400' : 'text-zinc-600'}>Demand:</span> <strong>{unit.demand} MT</strong></div>
                              <div><span className={darkMode ? 'text-zinc-400' : 'text-zinc-600'}>Stock:</span> <strong>{unit.stock} MT</strong></div>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <MapPin className="w-3 h-3 text-indigo-500" />
                              <span>{unit.location}</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'allocations' && (
                <motion.div variants={containerVariants} initial="hidden" animate="visible">
                  <motion.h2 variants={itemVariants} className="text-3xl font-bold mb-8">Allocation Management</motion.h2>
                  <AllocationTable />
                </motion.div>
              )}

              {activeTab === 'transportation' && (
                <motion.div variants={containerVariants} initial="hidden" animate="visible">
                  <div className="space-y-8">
                    <motion.div variants={itemVariants} className="flex justify-between items-center">
                      <h2 className="text-3xl font-bold">Transportation Overview</h2>
                      <div className="flex gap-2">
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                          Live Logistics Feed
                        </span>
                      </div>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <KPICard icon={Truck} label="Active Shipments" value={allocations.filter(a => a.status === 'Active').length} unit="" trend={12} darkMode={darkMode} cardBg={cardBg} borderClass={borderClass} />
                      <KPICard icon={Clock} label="Avg. Transit Time" value={Math.round(allocations.reduce((acc, a) => acc + a.transitTime, 0) / (allocations.length || 1))} unit=" hrs" trend={-5} darkMode={darkMode} cardBg={cardBg} borderClass={borderClass} />
                      <KPICard icon={MapPin} label="Total Distance" value={allocations.reduce((acc, a) => acc + a.distance, 0)} unit=" km" trend={8} darkMode={darkMode} cardBg={cardBg} borderClass={borderClass} />
                      <KPICard icon={DollarSign} label="Cost Efficiency" value={88.2} unit="%" trend={2.4} darkMode={darkMode} cardBg={cardBg} borderClass={borderClass} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <motion.div variants={itemVariants} className={`${cardBg} rounded-lg p-6 border ${borderClass} shadow-sm lg:col-span-1`}>
                        <h3 className="font-semibold text-lg mb-4">Mode Distribution</h3>
                        <div className="space-y-4">
                          {['T1', 'T2'].map((mode) => {
                            const count = allocations.filter(a => a.mode === mode).length;
                            const percentage = Math.round((count / (allocations.length || 1)) * 100);
                            return (
                              <div key={mode}>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="font-medium text-zinc-700 dark:text-zinc-300">{mode}</span>
                                  <span className="text-zinc-500 font-mono">{percentage}%</span>
                                </div>
                                <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    className={`h-full ${mode === 'T1' ? 'bg-indigo-500' : 'bg-emerald-500'}`}
                                  ></motion.div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>

                      <motion.div variants={itemVariants} className={`${cardBg} rounded-lg p-6 border ${borderClass} shadow-sm lg:col-span-2`}>
                        <h3 className="font-semibold text-lg mb-4">Shipment Status Tracking</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className={`border-b ${borderClass}`}>
                              <tr>
                                <th className="text-left py-3 px-4">Tracking ID</th>
                                <th className="text-left py-3 px-4">Route</th>
                                <th className="text-left py-3 px-4 text-center">Progress</th>
                                <th className="text-left py-3 px-4">ETA</th>
                                <th className="text-left py-3 px-4">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {allocations.map((alloc) => (
                                <tr key={alloc.id} className={`border-b ${borderClass} hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors`}>
                                  <td className="py-3 px-4 font-mono text-xs text-indigo-600 font-bold">TRK-{202400 + alloc.id}</td>
                                  <td className="py-3 px-4 text-xs font-medium">{getPlantName(alloc.plantId).split(' ')[0]} → {getUnitName(alloc.unitId).split(' ')[0]}</td>
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                      <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                        <motion.div
                                          initial={{ width: 0 }}
                                          animate={{ width: alloc.status === 'Active' ? '65%' : '0%' }}
                                          className={`h-full ${alloc.status === 'Active' ? 'bg-indigo-500' : 'bg-zinc-400'}`}
                                        ></motion.div>
                                      </div>
                                      <span className="text-[10px] font-mono whitespace-nowrap">{alloc.status === 'Active' ? '65%' : '0%'}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-xs">{alloc.transitTime - 12}h remaining</td>
                                  <td className="py-3 px-4 text-xs">
                                    <span className={`px-2 py-1 rounded-full whitespace-nowrap font-bold border ${alloc.status === 'Active'
                                      ? 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-200 dark:border-indigo-800'
                                      : 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800'}`}>
                                      {alloc.status === 'Active' ? 'In-Transit' : 'Queued'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'analytics' && (
                <motion.div variants={containerVariants} initial="hidden" animate="visible">
                  <div className="space-y-8">
                    <motion.div variants={itemVariants} className="flex justify-between items-center">
                      <h2 className="text-3xl font-bold">Analytics & Intelligence</h2>
                      <div className="flex gap-4">
                        <select className={`p-2 border ${borderClass} ${inputBg} rounded-lg text-xs font-medium`}>
                          <option>Last 3 Months (Default Plan)</option>
                          <option>Year to Date</option>
                        </select>
                      </div>
                    </motion.div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg flex items-center gap-3 text-sm"
                      >
                        <AlertTriangle className="w-5 h-5" />
                        <div>
                          <p className="font-bold">Backend Connection Error</p>
                          <p className="opacity-80">{error}</p>
                        </div>
                      </motion.div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Cost Optimization Analysis */}
                      <GraphContainer
                        variants={itemVariants}
                        title="Financial Distribution"
                        darkMode={darkMode}
                        cardBg={cardBg}
                        borderClass={borderClass}
                        className="h-96"
                      >
                        {kpis.totalProduction > 0 || kpis.transportCost > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: 'Production', value: (kpis.totalProduction || 0) * 450 },
                                  { name: 'Transport', value: (kpis.transportCost || 0) },
                                  { name: 'Handling', value: (kpis.transportCost || 0) * 0.15 },
                                  { name: 'Inventory', value: (kpis.availableStock || 0) * 50 }
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={8}
                                dataKey="value"
                              >
                                {['#4F46E5', '#10B981', '#F59E0B', '#EF4444'].map((color, index) => (
                                  <Cell key={`cell-${index}`} fill={color} />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{ backgroundColor: darkMode ? '#1e293b' : '#ffffff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                itemStyle={{ color: darkMode ? '#f1f5f9' : '#1e293b' }}
                              />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-zinc-500">No financial data available</div>
                        )}
                      </GraphContainer>

                      {/* Capacity vs Utilization */}
                      <GraphContainer
                        variants={itemVariants}
                        title="Plant Performance (MT)"
                        darkMode={darkMode}
                        cardBg={cardBg}
                        borderClass={borderClass}
                        className="h-96"
                      >
                        {plants && plants.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={plants}>
                              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                              <XAxis dataKey="code" stroke={darkMode ? '#94a3b8' : '#64748b'} fontSize={12} />
                              <YAxis stroke={darkMode ? '#94a3b8' : '#64748b'} fontSize={12} />
                              <Tooltip
                                cursor={{ fill: 'rgba(79, 70, 229, 0.05)' }}
                                contentStyle={{ backgroundColor: darkMode ? '#1e293b' : '#ffffff', borderRadius: '12px', border: 'none' }}
                              />
                              <Bar dataKey="production" name="Production" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="stock" name="Current Stock" fill="#10B981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-zinc-500">No plant data available</div>
                        )}
                      </GraphContainer>

                      {/* Mode Efficiency Analysis */}
                      <GraphContainer
                        variants={itemVariants}
                        title="Transport Efficiency (Cost/MT)"
                        darkMode={darkMode}
                        cardBg={cardBg}
                        borderClass={borderClass}
                        className="h-96"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={modeEfficiency} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                            <XAxis type="number" stroke={darkMode ? '#94a3b8' : '#64748b'} fontSize={12} />
                            <YAxis dataKey="mode" type="category" stroke={darkMode ? '#94a3b8' : '#64748b'} fontSize={12} />
                            <Tooltip
                              contentStyle={{ backgroundColor: darkMode ? '#1e293b' : '#ffffff', borderRadius: '12px', border: 'none' }}
                              itemStyle={{ color: '#4F46E5' }}
                            />
                            <Bar dataKey="costPerMT" name="Cost per Metric Ton" fill="#6366f1" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </GraphContainer>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* AI Insights Panel */}
                      <motion.div variants={itemVariants} className={`${cardBg} rounded-xl p-8 border ${borderClass} shadow-xl lg:col-span-2`}>
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-purple-600" />
                          </div>
                          <h3 className="font-bold text-xl">Smart Optimization Insights</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className={`p-4 rounded-xl border ${borderClass} ${darkMode ? 'bg-zinc-800/50' : 'bg-slate-50'}`}>
                            <h4 className="font-bold text-sm text-indigo-500 mb-2 flex items-center gap-2">
                              <Package className="w-4 h-4" /> Inventory Optimization
                            </h4>
                            <p className="text-xs leading-relaxed opacity-80">
                              Current stock levels at <strong>IU_002</strong> are sufficient for the next 12 days. Consider redirecting T2 Express shipments to T1 Regular to save 15% on freight costs.
                            </p>
                          </div>
                          <div className={`p-4 rounded-xl border ${borderClass} ${darkMode ? 'bg-zinc-800/50' : 'bg-slate-50'}`}>
                            <h4 className="font-bold text-sm text-emerald-500 mb-2 flex items-center gap-2">
                              <Truck className="w-4 h-4" /> Logistics Efficiency
                            </h4>
                            <p className="text-xs leading-relaxed opacity-80">
                              Route efficiency is at <strong>94%</strong>. Minor congestion detected near <strong>GU_023</strong>; suggest increasing buffer time by 2.5 hours for upcoming allocations.
                            </p>
                          </div>
                          <div className={`p-4 rounded-xl border ${borderClass} ${darkMode ? 'bg-zinc-800/50' : 'bg-slate-50'}`}>
                            <h4 className="font-bold text-sm text-amber-500 mb-2 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4" /> Risk Mitigation
                            </h4>
                            <p className="text-xs leading-relaxed opacity-80">
                              Demand surge predicted for <strong>GU_015</strong> in Period 2. Recommend pre-allocating 1,200 MT from <strong>IU_008</strong> to maintain safety stock levels.
                            </p>
                          </div>
                          <div className={`p-4 rounded-xl border ${borderClass} ${darkMode ? 'bg-zinc-800/50' : 'bg-slate-50'}`}>
                            <h4 className="font-bold text-sm text-purple-500 mb-2 flex items-center gap-2">
                              <DollarSign className="w-4 h-4" /> Cost Savings
                            </h4>
                            <p className="text-xs leading-relaxed opacity-80">
                              Total potential savings of <strong>$4,250</strong> identified by cross-docking 500 MT between <strong>GU_009</strong> and <strong>GU_011</strong> instead of direct plant supply.
                            </p>
                          </div>
                        </div>
                      </motion.div>

                      {/* Demand Satisfaction Meter */}
                      <motion.div variants={itemVariants} className={`${cardBg} rounded-xl p-8 border ${borderClass} shadow-xl`}>
                        <h3 className="font-bold text-xl mb-6">Unit Demand Satisfaction</h3>
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                          {demandFulfillment.slice(0, 10).map((item) => (
                            <div key={item.name} className="space-y-1">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold">{item.name}</span>
                                <span className={item.percentage > 80 ? 'text-emerald-500' : 'text-amber-500'}>{item.percentage}% Fulfilled</span>
                              </div>
                              <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${item.percentage}%` }}
                                  className={`h-full ${item.percentage > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                ></motion.div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => setActiveTab('plantsunits')}
                          className="w-full mt-6 py-2 text-xs font-bold text-indigo-500 border border-indigo-500/20 rounded-lg hover:bg-indigo-500 hover:text-white transition-all"
                        >
                          View All Units
                        </button>
                      </motion.div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[
                        { label: 'Unmet Demand', value: '0.0 MT', desc: 'System currently optimal', color: 'text-emerald-500', icon: Check },
                        { label: 'Network Efficiency', value: '91.4%', desc: 'Route optimization active', color: 'text-indigo-500', icon: TrendingUp },
                        { label: 'Risk Factor', value: 'Low', desc: 'Stock levels healthy', color: 'text-amber-500', icon: AlertTriangle }
                      ].map((card, i) => (
                        <motion.div
                          key={i}
                          variants={itemVariants}
                          className={`${cardBg} rounded-xl p-6 border ${borderClass} shadow-lg hover:border-indigo-500/50 transition-colors group`}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl ${darkMode ? 'bg-zinc-800' : 'bg-slate-100'} group-hover:bg-indigo-600 transition-colors`}>
                              <card.icon className={`w-6 h-6 ${card.color} group-hover:text-white`} />
                            </div>
                            <span className="text-zinc-400 text-xs font-mono">Real-time</span>
                          </div>
                          <h4 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">{card.label}</h4>
                          <p className="text-2xl font-bold mt-1">{card.value}</p>
                          <p className="text-zinc-400 text-xs mt-2 italic">{card.desc}</p>
                        </motion.div>
                      ))}
                    </div>

                    {/* Geographical Heatmap Component */}
                    <motion.div variants={itemVariants} className={`${cardBg} rounded-xl p-8 border ${borderClass} shadow-xl`}>
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold text-xl">Interactive Supply Map</h3>
                          <div className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] rounded font-bold uppercase tracking-wider">Live</div>
                        </div>
                        <div className="flex gap-4">
                          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                            <span className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span> High Volume (&gt;1.5M)
                          </span>
                          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                            <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span> Standard
                          </span>
                        </div>
                      </div>

                      <div className="h-[450px] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700 relative group">
                        <MapContainer
                          key={`map-${darkMode}-${allocations.length}`}
                          center={[22.5, 78.5]}
                          zoom={5}
                          style={{ height: '100%', width: '100%' }}
                          scrollWheelZoom={false}
                          className="z-0"
                        >
                          <TileLayer
                            url={darkMode
                              ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                              : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          />

                          {/* Render Plants */}
                          {plants.map(plant => (
                            <Marker
                              key={`plant-${plant.id}`}
                              position={[plant.latitude, plant.longitude]}
                              icon={new L.DivIcon({
                                className: 'custom-div-icon',
                                html: `<div style="background-color: #4f46e5; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(79, 70, 229, 0.8);"></div>`,
                                iconSize: [12, 12],
                                iconAnchor: [6, 6]
                              })}
                            >
                              <Popup>
                                <div className="p-1">
                                  <p className="font-bold text-indigo-600">{plant.name}</p>
                                  <p className="text-xs text-zinc-500">Stock: {(plant.stock / 1000000).toFixed(1)}M MT</p>
                                </div>
                              </Popup>
                            </Marker>
                          ))}

                          {/* Render Grinding Units */}
                          {grindingUnits.map(unit => (
                            <Marker
                              key={`unit-${unit.id}`}
                              position={[unit.latitude, unit.longitude]}
                              icon={new L.DivIcon({
                                className: 'custom-div-icon',
                                html: `<div style="background-color: #10b981; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px rgba(16, 185, 129, 0.8);"></div>`,
                                iconSize: [10, 10],
                                iconAnchor: [5, 5]
                              })}
                            >
                              <Popup>
                                <div className="p-1">
                                  <p className="font-bold text-green-600">{unit.name}</p>
                                  <p className="text-xs text-zinc-500">Demand: {(unit.demand / 1000).toFixed(1)}k MT</p>
                                </div>
                              </Popup>
                            </Marker>
                          ))}

                          {/* Render Allocation Routes */}
                          {allocations.map((alloc, idx) => {
                            const plant = plants.find(p => p.id === alloc.plantId);
                            const unit = grindingUnits.find(u => u.id === alloc.unitId);
                            if (!plant || !unit) return null;

                            const isHighVolume = alloc.quantity > 1500;
                            const color = isHighVolume ? '#ef4444' : '#6366f1';

                            return (
                              <Polyline
                                key={`route-${idx}`}
                                positions={[
                                  [plant.latitude, plant.longitude],
                                  [unit.latitude, unit.longitude]
                                ]}
                                color={color}
                                weight={isHighVolume ? 4 : 2}
                                opacity={0.6}
                                dashArray={alloc.mode === 'T2' ? "5, 10" : undefined}
                              >
                                <Popup>
                                  <div className="p-2 space-y-1">
                                    <p className="font-bold flex items-center gap-2">
                                      {plant.code} → {unit.code}
                                    </p>
                                    <div className="h-px bg-zinc-100 my-1" />
                                    <p className="text-sm font-medium">Quantity: <span className="text-indigo-600">{alloc.quantity.toLocaleString()} MT</span></p>
                                    <p className="text-xs text-zinc-500">Mode: {alloc.mode}</p>
                                    <p className="text-xs text-zinc-500">Status: <span className={`font-bold ${alloc.status === 'Active' ? 'text-green-500' : 'text-amber-500'}`}>{alloc.status}</span></p>
                                  </div>
                                </Popup>
                              </Polyline>
                            );
                          })}
                        </MapContainer>

                        {/* Map Overlay for total paths */}
                        <div className="absolute bottom-4 right-4 z-[1000] bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-xl pointer-events-none">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter mb-1">Visualization Info</p>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-indigo-600">{allocations.length}</span>
                            <span className="text-xs font-medium text-zinc-500 leading-tight">Active Supply<br />Paths Routed</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'alerts' && (
                <motion.div variants={containerVariants} initial="hidden" animate="visible">
                  <div className="space-y-6">
                    <motion.div variants={itemVariants} className="flex justify-between items-center">
                      <h2 className="text-3xl font-bold">System Alerts</h2>
                      <button className="text-sm text-indigo-600 font-medium hover:underline">Mark all as read</button>
                    </motion.div>

                    <div className="space-y-4">
                      {alerts.length > 0 ? alerts.map((alert) => (
                        <motion.div
                          key={alert.id}
                          variants={itemVariants}
                          className={`${cardBg} rounded-xl p-5 border ${borderClass} shadow-sm border-l-4 ${alert.severity === 'critical' ? 'border-l-red-500' : alert.severity === 'warning' ? 'border-l-amber-500' : 'border-l-blue-500'} flex items-center justify-between group hover:shadow-md transition-all`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${alert.severity === 'critical' ? 'bg-red-100 text-red-600' : alert.severity === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                              <alert.icon className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-bold text-sm">{alert.title}</h4>
                              <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1">{alert.message}</p>
                              <span className="text-[10px] text-zinc-400 mt-2 block font-mono uppercase tracking-wider">{alert.time}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setAlerts(alerts.filter(a => a.id !== alert.id))}
                              className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md text-[10px] font-bold"
                            >
                              DISMISS
                            </button>
                            <button className="px-3 py-1 bg-indigo-600 text-white rounded-md text-[10px] font-bold">RESOLVE</button>
                          </div>
                        </motion.div>
                      )) : (
                        <div className="text-center py-20 opacity-50">
                          <Check className="w-12 h-12 mx-auto mb-4 text-green-500" />
                          <p>No active alerts. System is healthy.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AddAllocationModal />
    </div>
  );
};

export default ClinkerAllocationSystem;
