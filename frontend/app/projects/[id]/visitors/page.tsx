"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  UserGroupIcon,
  IdentificationIcon,
  ChartBarIcon,
  EyeIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { getVisitors, getTrackingStats, Visitor, TrackingStats } from "@/lib/api/tracking";
import { formatDistanceToNow } from "date-fns";

export default function VisitorsPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [stats, setStats] = useState<TrackingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterIdentified, setFilterIdentified] = useState<boolean | undefined>(undefined);
  const [minSessions, setMinSessions] = useState<number | undefined>(undefined);

  useEffect(() => {
    loadData();
  }, [workspaceId, filterIdentified, minSessions]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [visitorsResponse, statsResponse] = await Promise.all([
        getVisitors(workspaceId, {
          identified: filterIdentified,
          minSessions,
          limit: 50,
        }),
        getTrackingStats(workspaceId),
      ]);

      if (visitorsResponse.success) {
        setVisitors(visitorsResponse.data);
      }

      if (statsResponse.success) {
        setStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, label, value, color }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </motion.div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Visitor Analytics
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track anonymous visitors and monitor lead conversion
        </p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={UserGroupIcon}
            label="Total Visitors"
            value={stats.totalVisitors.toLocaleString()}
            color="bg-blue-600"
          />
          <StatCard
            icon={EyeIcon}
            label="Anonymous Visitors"
            value={stats.anonymousVisitors.toLocaleString()}
            color="bg-gray-600"
          />
          <StatCard
            icon={IdentificationIcon}
            label="Identified Visitors"
            value={stats.identifiedVisitors.toLocaleString()}
            color="bg-green-600"
          />
          <StatCard
            icon={ChartBarIcon}
            label="Conversion Rate"
            value={`${stats.conversionRate.toFixed(1)}%`}
            color="bg-purple-600"
          />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Filters
        </h2>
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Visitor Type
            </label>
            <select
              value={filterIdentified === undefined ? 'all' : filterIdentified ? 'identified' : 'anonymous'}
              onChange={(e) => {
                const value = e.target.value;
                setFilterIdentified(
                  value === 'all' ? undefined : value === 'identified'
                );
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Visitors</option>
              <option value="identified">Identified Only</option>
              <option value="anonymous">Anonymous Only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Minimum Sessions
            </label>
            <select
              value={minSessions || 'all'}
              onChange={(e) => {
                const value = e.target.value;
                setMinSessions(value === 'all' ? undefined : parseInt(value));
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Sessions</option>
              <option value="2">2+ Sessions</option>
              <option value="3">3+ Sessions</option>
              <option value="5">5+ Sessions</option>
            </select>
          </div>
        </div>
      </div>

      {/* Event Types Distribution */}
      {stats && stats.eventsByType && Object.keys(stats.eventsByType).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Event Distribution
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.eventsByType).map(([type, count]) => (
              <div key={type} className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {count.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {type.replace('_', ' ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visitors List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Visitors
          </h2>
        </div>

        {visitors.length === 0 ? (
          <div className="p-12 text-center">
            <UserGroupIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              No visitors tracked yet. Install the tracking script on your landing pages to start tracking visitors.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Visitor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Sessions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Page Views
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Website
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Seen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {visitors.map((visitor) => (
                  <motion.tr
                    key={visitor._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-3 ${
                          visitor.contactId ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        <div>
                          {visitor.contactId ? (
                            <>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {visitor.contactId.firstName} {visitor.contactId.lastName}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {visitor.contactId.email}
                              </div>
                            </>
                          ) : (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Anonymous ({visitor.visitorId.slice(0, 8)}...)
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        visitor.contactId
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {visitor.contactId ? 'Identified' : 'Anonymous'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {visitor.sessionCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {visitor.pageViewCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {visitor.websites && visitor.websites.length > 0 ? visitor.websites[0] : 'Unknown'}
                      </div>
                      {visitor.websites && visitor.websites.length > 1 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          +{visitor.websites.length - 1} more
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {visitor.firstUtmSource || visitor.firstSource || 'Direct'}
                      </div>
                      {visitor.firstUtmCampaign && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {visitor.firstUtmCampaign}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(new Date(visitor.lastSeen), { addSuffix: true })}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
