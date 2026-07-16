import React, { useEffect, useState } from 'react';
import { MapPin, Users, Navigation, Calendar, Loader2, RefreshCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/config/api.config';

interface Location {
    userId: string;
    name: string;
    email: string;
    role: 'patient' | 'provider';
    location: {
        latitude: number;
        longitude: number;
        address?: string;
        updatedAt: string;
    };
}

const AdminLocationDashboard: React.FC = () => {
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState<'all' | 'patient' | 'provider'>('all');
    const { toast } = useToast();

    // Fetch all locations
    const fetchLocations = async () => {
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API_BASE_URL}/admin/locations`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch locations');
            }

            setLocations(data.locations);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch locations');
            toast({
                title: 'Error',
                description: err.message || 'Failed to fetch locations',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLocations();
    }, []);

    // Filter locations by role
    const filteredLocations = locations.filter((loc) => {
        if (filter === 'all') return true;
        return loc.role === filter;
    });

    // Stats
    const stats = {
        total: locations.length,
        patients: locations.filter((l) => l.role === 'patient').length,
        providers: locations.filter((l) => l.role === 'provider').length,
    };

    // Format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Open in Google Maps
    const openInMaps = (lat: number, lng: number) => {
        window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                                <MapPin className="w-8 h-8 text-blue-600" />
                                Location Tracking Dashboard
                            </h1>
                            <p className="text-gray-600 mt-2">
                                Monitor all user locations in real-time
                            </p>
                        </div>
                        <button
                            onClick={fetchLocations}
                            disabled={loading}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">
                                    Total Locations
                                </p>
                                <p className="text-3xl font-bold text-gray-800 mt-1">
                                    {stats.total}
                                </p>
                            </div>
                            <div className="bg-blue-100 p-3 rounded-full">
                                <MapPin className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">
                                    Patient Locations
                                </p>
                                <p className="text-3xl font-bold text-gray-800 mt-1">
                                    {stats.patients}
                                </p>
                            </div>
                            <div className="bg-green-100 p-3 rounded-full">
                                <Users className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">
                                    Provider Locations
                                </p>
                                <p className="text-3xl font-bold text-gray-800 mt-1">
                                    {stats.providers}
                                </p>
                            </div>
                            <div className="bg-purple-100 p-3 rounded-full">
                                <Navigation className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-gray-700">Filter by:</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    filter === 'all'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilter('patient')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    filter === 'patient'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Patients
                            </button>
                            <button
                                onClick={() => setFilter('provider')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    filter === 'provider'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Providers
                            </button>
                        </div>
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        <span className="ml-3 text-gray-600">Loading locations...</span>
                    </div>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Locations Table */}
                {!loading && !error && (
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            User
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Role
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Coordinates
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Address
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Last Updated
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredLocations.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center">
                                                <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                                <p className="text-gray-500">
                                                    No locations found
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredLocations.map((loc) => (
                                            <tr
                                                key={loc.userId}
                                                className="hover:bg-gray-50 transition-colors"
                                            >
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="font-medium text-gray-800">
                                                            {loc.name}
                                                        </p>
                                                        <p className="text-sm text-gray-500">
                                                            {loc.email}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                                            loc.role === 'patient'
                                                                ? 'bg-green-100 text-green-700'
                                                                : 'bg-purple-100 text-purple-700'
                                                        }`}
                                                    >
                                                        {loc.role.charAt(0).toUpperCase() + loc.role.slice(1)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm">
                                                        <p className="text-gray-700">
                                                            Lat: {loc.location.latitude.toFixed(6)}
                                                        </p>
                                                        <p className="text-gray-700">
                                                            Lng: {loc.location.longitude.toFixed(6)}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm text-gray-700 max-w-xs truncate">
                                                        {loc.location.address || 'N/A'}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <Calendar className="w-4 h-4" />
                                                        {formatDate(loc.location.updatedAt)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() =>
                                                            openInMaps(
                                                                loc.location.latitude,
                                                                loc.location.longitude
                                                            )
                                                        }
                                                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                                                    >
                                                        <MapPin className="w-4 h-4" />
                                                        View Map
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminLocationDashboard;
