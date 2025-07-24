
"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiBaseUrl } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { io } from "socket.io-client";

interface FailedJob {
  jobId: string;
  reason: string;
}

interface JobDetail {
  jobId: string;
  title: string;
  company: string;
  location: string;
  url: string;
}

interface ImportLog {
  fileName: string;
  timestamp: string;
  totalFetched: number;
  totalImported: number;
  newJobs: number;
  newJobsDetails?: JobDetail[];
  updatedJobs: number;
  failedJobs: FailedJob[];
  fetchedJobs: JobDetail[];
}

const App: React.FC = () => {
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFailedJobs, setSelectedFailedJobs] = useState<FailedJob[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${getApiBaseUrl()}/api/import/logs`);
      const data = response.data;
      if (data.logs && Array.isArray(data.logs)) {
        setLogs(data.logs);
      } else if (Array.isArray(data)) {
        setLogs(data);
      } else if (data) {
        setLogs([data]);
      } else {
        setLogs([]);
      }
      fetchJobs();
    } catch (error) {
      toast.error("Failed to fetch logs");
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const [jobs, setJobs] = React.useState([]);
  const [jobsPage, setJobsPage] = React.useState(1);
  const [jobsTotalPages, setJobsTotalPages] = React.useState(1);
  const [jobsLoading, setJobsLoading] = React.useState(false);

  const fetchJobs = async () => {
    setJobsLoading(true);
    try {
      const response = await axios.get(`${getApiBaseUrl()}/api/import/jobs`);
      const fetchedJobs = response.data.jobs || response.data;
      setJobs(fetchedJobs);
    } catch (error) {
      toast.error("Failed to fetch jobs");
      console.error("Failed to fetch jobs:", error);
    } finally {
      setJobsLoading(false);
    }
  };

  const fetchNewJobs = async () => {
    try {
      const response = await axios.get(`${getApiBaseUrl()}/api/import/jobs/new`);
      setNewJobs(response.data);
    } catch (error) {
      toast.error("Failed to fetch new jobs");
      console.error('Failed to fetch new jobs:', error);
    }
  };

  const fetchFailedJobs = async () => {
    try {
      const response = await axios.get(`${getApiBaseUrl()}/api/import/jobs/failed`);
      setFailedJobs(response.data);
    } catch (error) {
      toast.error("Failed to fetch failed jobs");
      console.error('Failed to fetch failed jobs:', error);
    }
  };

  const [newJobs, setNewJobs] = React.useState([]);
  const [failedJobs, setFailedJobs] = React.useState([]);

  useEffect(() => {
    fetchNewJobs();
    fetchFailedJobs();
  }, []);

  const handleJobsPageChange = () => {
    fetchJobs();
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(() => {
      fetchLogs();
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Socket.IO for live updates
    const socket = io(getApiBaseUrl());
    socket.on("import-log-updated", (log) => {
      setLogs([log]);
      toast.success("Job import completed!");
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  const handleFailedJobsClick = (failedJobs: FailedJob[]) => {
    if (!failedJobs || failedJobs.length === 0) {
      setModalTitle('Failed Jobs Details');
      setModalContent(
        <div className="p-4">
          <p className="text-gray-700">No failed jobs available.</p>
        </div>
      );
      setIsModalOpen(true);
      return;
    }
    setModalTitle('Failed Jobs Details');
    setModalContent(
      <ScrollArea className="max-h-[400px] mt-4">
        <div className="space-y-4">
          {failedJobs.map((job: FailedJob, index: number) => (
            <div
              key={index}
              className="p-4 bg-red-50 border border-red-100 rounded-lg"
            >
              <div className="flex items-start gap-4">
                <i className="fas fa-times-circle text-red-500 mt-1"></i>
                <div>
                  <div className="font-medium text-gray-900">
                    Job ID: {job.jobId}
                  </div>
                  <div className="text-red-600 mt-1">{job.reason}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
    setIsModalOpen(true);
  };

  const handleCountClick = (title: string, count: number, log: ImportLog) => {
    if (count === 0) {
      setModalTitle(title);
      setModalContent(
        <div className="p-4">
          <p className="text-gray-700">Count: 0</p>
          <p className="text-gray-500 mt-2 italic">No further details available.</p>
        </div>
      );
      setIsModalOpen(true);
      return;
    }

    let content = null;

    if (title === 'Total Fetched' || title === 'Total Imported') {
      content = (
        <ScrollArea className="max-h-[400px] mt-4">
          <div className="space-y-4">
            {log.fetchedJobs && log.fetchedJobs.length > 0 ? (
              log.fetchedJobs.map((job, index) => (
                <div key={index} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="font-medium text-gray-900">{job.title || job.summary || 'No Title'}</div>
                  <div className="text-gray-700"><strong>Company:</strong> {job.company || job.author || 'Unknown Company'}</div>
                  <div className="text-gray-600"><strong>Location:</strong> {job.location || job['job:location'] || 'Unknown Location'}</div>
                  <div className="text-sm text-gray-500"><strong>Category:</strong> {job.category || job['job:category'] || 'General'}</div>
                  <div className="text-sm text-gray-500"><strong>Job Type:</strong> {job.jobType || job['job:type'] || job.type || 'Full-time'}</div>
                  <div className="text-xs text-gray-400"><strong>Source:</strong> {job.source || 'Unknown'}</div>
                  {(job.link || job.url) ? (
                    <a href={job.link || job.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                      View Job
                    </a>
                  ) : (
                    <span className="text-gray-400">No URL available</span>
                  )}
                </div>
              ))
            ) : (
              <div className="p-4 text-gray-500">No jobs data available</div>
            )}
          </div>
        </ScrollArea>
      );
    } else if (title === 'New Jobs') {
      if (!log.newJobsDetails || log.newJobsDetails.length === 0) {
        content = (
          <div className="p-4">
            <p className="text-gray-700">No new jobs available.</p>
          </div>
        );
      } else {
        content = (
          <ScrollArea className="max-h-[400px] mt-4">
            <div className="space-y-4">
              {log.newJobsDetails.map((job, index) => (
                <div key={index} className="p-4 bg-green-50 border border-green-100 rounded-lg">
                  <div className="font-medium text-gray-900">{job.title || 'No Title'}</div>
                  <div className="text-gray-700"><strong>Company:</strong> {job.company || 'Unknown Company'}</div>
                  <div className="text-gray-600"><strong>Location:</strong> {job.location || 'Unknown Location'}</div>
                  <div className="text-sm text-gray-500"><strong>Category:</strong> {job.category || 'General'}</div>
                  <div className="text-sm text-gray-500"><strong>Job Type:</strong> {job.jobType || 'Full-time'}</div>
                  {job.url ? (
                    <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                      View Job
                    </a>
                  ) : (
                    <span className="text-gray-400">No URL available</span>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        );
      }
    } else if (title === 'Updated Jobs') {
      content = (
        <div className="p-4">
          <p className="text-gray-700">Detailed job data for Updated Jobs is not available.</p>
        </div>
      );
    } else if (title === 'Failed Jobs') {
      content = (
        <ScrollArea className="max-h-[400px] mt-4">
          <div className="space-y-4">
            {log.failedJobs.map((job, index) => (
              <div key={index} className="p-4 bg-red-50 border border-red-100 rounded-lg">
                <div className="font-medium text-gray-900">Job ID: {job.jobId}</div>
                <div className="text-red-600 mt-1">{job.reason}</div>
              </div>
            ))}
          </div>
        </ScrollArea>
      );
    }

    setModalTitle(title);
    setModalContent(content);
    setIsModalOpen(true);
  };

  // Add "View All Fetched Jobs" modal logic
  const [isFetchedJobsModalOpen, setIsFetchedJobsModalOpen] = useState(false);
  const [fetchedJobsModalContent, setFetchedJobsModalContent] = useState<React.ReactNode>(null);
  const handleFetchedJobsClick = (log: ImportLog) => {
    setFetchedJobsModalContent(
      <ScrollArea className="max-h-[400px] mt-4">
        <div className="space-y-4">
          {log.fetchedJobs.map((job, index) => (
            <div key={index} className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <div className="font-medium text-gray-900">{job.title || job.summary || 'No Title'}</div>
              <div className="text-gray-700"><strong>Company:</strong> {job.company || job.author || 'Unknown Company'}</div>
              <div className="text-gray-600"><strong>Location:</strong> {job.location || job['job:location'] || 'Unknown Location'}</div>
              <div className="text-sm text-gray-500"><strong>Category:</strong> {job.category || job['job:category'] || 'General'}</div>
              <div className="text-sm text-gray-500"><strong>Job Type:</strong> {job.jobType || job['job:type'] || job.type || 'Full-time'}</div>
              <div className="text-xs text-gray-400"><strong>Source:</strong> {job.source || 'Unknown'}</div>
              {(job.url || job.link) ? (
                <a href={job.url || job.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  View Job
                </a>
              ) : (
                <span className="text-gray-400">No URL available</span>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    );
    setIsFetchedJobsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1440px] mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Job Import History
          </h1>
          <Button
            onClick={fetchLogs}
            className="!rounded-button whitespace-nowrap cursor-pointer"
            disabled={loading}
          >
            <i className="fas fa-sync-alt mr-2"></i>
            Refresh Data
          </Button>
        </div>

        <Card className="bg-white shadow-sm">
          <ScrollArea className="h-[800px]">
            {loading ? (
              <div className="p-4 space-y-4">
                {[...Array(5)].map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div>
                <p className="p-4 text-sm text-gray-600">Logs count: {logs.length}</p>
                {logs.length === 0 ? (
                  <p className="p-4 text-red-600">No logs found</p>
                ) : null}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead className="text-right">Total Fetched</TableHead>
                      <TableHead className="text-right">Total Imported</TableHead>
                      <TableHead className="text-right">New Jobs</TableHead>
                      <TableHead className="text-right">Updated Jobs</TableHead>
                      <TableHead className="text-right">Failed Jobs</TableHead>
                      <TableHead className="text-right">Fetched Jobs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium max-w-[300px] truncate">
                        {log.fileName}
                      </TableCell>
                      <TableCell>
                        {log.timestamp ? (
                          format(new Date(log.timestamp), "dd MMM yyyy, hh:mm a")
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          className="!rounded-button whitespace-nowrap cursor-pointer"
                          onClick={() => handleCountClick('Total Fetched', log.totalFetched, log)}
                        >
                          {log.totalFetched}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          className="!rounded-button whitespace-nowrap cursor-pointer"
                          onClick={() => handleCountClick('Total Imported', log.totalImported, log)}
                        >
                          {log.totalImported}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          className="!rounded-button whitespace-nowrap cursor-pointer"
                          onClick={() => handleCountClick('New Jobs', log.newJobs, log)}
                        >
                          {log.newJobs}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          className="!rounded-button whitespace-nowrap cursor-pointer"
                          onClick={() => handleCountClick('Updated Jobs', log.updatedJobs, log)}
                        >
                          {log.updatedJobs}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          className="!rounded-button whitespace-nowrap cursor-pointer"
                          onClick={() => handleFailedJobsClick(log.failedJobs)}
                        >
                          {log.failedJobs.length}
                          <i className="fas fa-exclamation-circle ml-2 text-red-500"></i>
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          className="!rounded-button whitespace-nowrap cursor-pointer"
                          onClick={() => handleFetchedJobsClick(log)}
                        >
                          View All
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </ScrollArea>
        </Card>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{modalTitle}</DialogTitle>
            </DialogHeader>
            {modalContent}
          </DialogContent>
        </Dialog>
        <Dialog open={isFetchedJobsModalOpen} onOpenChange={setIsFetchedJobsModalOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>All Fetched Jobs</DialogTitle>
            </DialogHeader>
            {fetchedJobsModalContent}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default App;
