"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Meeting } from "@/types/meeting";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Eye, ArrowRight } from "lucide-react";
import { EmptyMeetingsIllustration } from "@/components/ui/illustrations";

interface RecentMeetingsSectionProps {
  isLoading: boolean;
  recentMeetings: Meeting[];
  onViewDetails: (meeting: Meeting) => void;
}

export function RecentMeetingsSection({ isLoading, recentMeetings, onViewDetails }: RecentMeetingsSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <Card className="paper-card rounded-xl border border-border shadow-xs overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border bg-muted/30 py-4 px-6">
          <div className="space-y-0.5">
            <CardTitle className="text-base font-bold text-foreground">
              Recently Created Meetings
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Latest meeting notes and transcripts uploaded to Syncra.
            </CardDescription>
          </div>
          <Link href="/dashboard/meetings">
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-semibold flex items-center gap-1.5 border-border shadow-xs text-foreground hover:bg-muted rounded-lg"
            >
              View All <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/40 hover:bg-transparent">
                  <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider pl-6 py-3.5">
                    Title
                  </TableHead>
                  <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider py-3.5">
                    Type
                  </TableHead>
                  <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider py-3.5">
                    Date
                  </TableHead>
                  <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider py-3.5">
                    Participants
                  </TableHead>
                  <TableHead className="text-right font-semibold text-xs text-muted-foreground uppercase tracking-wider pr-6 py-3.5">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <TableRow key={idx} className="border-b border-border/50">
                      <TableCell className="pl-6 py-3.5">
                        <Skeleton className="h-4 w-52 rounded-md" />
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Skeleton className="h-5 w-24 rounded-lg" />
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Skeleton className="h-4 w-24 rounded-md" />
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Skeleton className="h-5 w-32 rounded-full" />
                      </TableCell>
                      <TableCell className="pr-6 py-3.5 text-right">
                        <Skeleton className="h-7 w-20 rounded-lg ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : recentMeetings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <EmptyMeetingsIllustration className="w-24 h-24 text-muted-foreground/60" />
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            No meetings recorded yet.
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Click &quot;Manage Meetings&quot; to get started.
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  recentMeetings.map((meeting, index) => (
                    <motion.tr
                      key={meeting.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="border-b border-border/50 hover:bg-muted/40 transition-colors"
                    >
                      <TableCell className="font-medium pl-6 py-3.5">
                        <button
                          onClick={() => onViewDetails(meeting)}
                          className="hover:underline text-left font-semibold text-foreground transition-colors"
                        >
                          {meeting.title}
                        </button>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Badge
                          variant="outline"
                          className="text-xs font-normal border-border bg-muted/50 text-foreground rounded-md"
                        >
                          {meeting.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                          <Calendar className="h-4 w-4 text-muted-foreground/70" />
                          {meeting.date}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <div className="flex flex-wrap gap-1 items-center">
                          {meeting.participants.slice(0, 2).map((p) => (
                            <span
                              key={p}
                              className="text-[11px] font-medium bg-muted text-foreground px-2 py-0.5 rounded-full border border-border"
                            >
                              {p.split("@")[0]}
                            </span>
                          ))}
                          {meeting.participants.length > 2 && (
                            <span className="text-[11px] text-muted-foreground font-medium ml-0.5">
                              +{meeting.participants.length - 2}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6 py-3.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewDetails(meeting)}
                          className="h-8 text-xs font-medium flex items-center gap-1.5 ml-auto text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                        >
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          Details
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-3 p-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-border paper-sheet space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-40 rounded-md" />
                    <Skeleton className="h-5 w-20 rounded-md" />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <Skeleton className="h-4 w-24 rounded-md" />
                    <Skeleton className="h-7 w-16 rounded-lg" />
                  </div>
                </div>
              ))
            ) : recentMeetings.length === 0 ? (
              <div className="p-8 text-center bg-card rounded-xl border border-border text-muted-foreground flex flex-col items-center justify-center space-y-3">
                <EmptyMeetingsIllustration className="w-20 h-20 text-muted-foreground/60" />
                <div>
                  <p className="text-sm font-bold text-foreground">No meetings recorded yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click &quot;Manage Meetings&quot; to get started.
                  </p>
                </div>
              </div>
            ) : (
              recentMeetings.map((meeting, index) => (
                <motion.div
                  key={meeting.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="p-4 rounded-xl border border-border paper-card shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => onViewDetails(meeting)}
                      className="text-sm font-semibold text-foreground hover:underline text-left"
                    >
                      {meeting.title}
                    </button>
                    <Badge
                      variant="outline"
                      className="text-[11px] font-normal border-border bg-muted text-foreground rounded-md shrink-0"
                    >
                      {meeting.type}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                      <Calendar className="h-4 w-4 text-muted-foreground/70" />
                      {meeting.date}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(meeting)}
                      className="h-7 text-xs font-medium flex items-center gap-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                    >
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      Details
                    </Button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
