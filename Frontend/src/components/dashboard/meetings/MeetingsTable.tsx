import { useState, useEffect } from "react";
import { Meeting } from "@/types/meeting";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Calendar,
  Eye,
  Edit,
  Trash2,
  Share2,
  Loader2,
  Archive,
  MapPinned,
  Pin,
  PinOff,
  Copy,
  MoreVertical,
  Repeat2,
} from "lucide-react";
import { EmptyMeetingsIllustration } from "@/components/ui/illustrations";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface MeetingsTableProps {
  isLoading: boolean;
  displayMeetings: Meeting[];
  onViewDetails: (meeting: Meeting) => void;
  onEdit: (meeting: Meeting) => void;
  onDelete: (meeting: Meeting) => void;
  onArchive: (meeting: Meeting) => void;
  onTogglePin: (meeting: Meeting) => void;
  pinningMeetingId: string | null;
  handleCreatingClone: (meeting: Meeting) => void;
  IsCloneMeetingLoading: boolean;
  onAssignSeries?: (meeting: Meeting) => void;
}

export function MeetingsTable({
  isLoading,
  displayMeetings,
  onViewDetails,
  onEdit,
  onDelete,
  onArchive,
  onTogglePin,
  pinningMeetingId,
  handleCreatingClone,
  IsCloneMeetingLoading,
  onAssignSeries,
}: MeetingsTableProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (!IsCloneMeetingLoading) {
      setOpenMenuId(null);
    }
  }, [IsCloneMeetingLoading]);

  return (
    <div className="hidden md:block paper-sheet rounded-xl border border-border overflow-hidden shadow-xs">
      <Table>
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
            <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider pr-6 py-3.5 text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, idx) => (
              <TableRow key={idx} className="border-b border-border/50">
                <TableCell className="pl-6 py-4">
                  <Skeleton className="h-4 w-48 rounded-md" />
                </TableCell>
                <TableCell className="py-4">
                  <Skeleton className="h-4 w-24 rounded-md" />
                </TableCell>
                <TableCell className="py-4">
                  <Skeleton className="h-4 w-28 rounded-md" />
                </TableCell>
                <TableCell className="py-4">
                  <Skeleton className="h-4 w-36 rounded-md" />
                </TableCell>
                <TableCell className="pr-6 py-4 text-right">
                  <Skeleton className="h-6 w-20 rounded-md ml-auto" />
                </TableCell>
              </TableRow>
            ))
          ) : displayMeetings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                <div className="flex flex-col items-center justify-center space-y-3">
                  <EmptyMeetingsIllustration className="w-24 h-24 text-muted-foreground/60" />
                  <div>
                    <p className="text-sm font-bold text-foreground">No meetings found matching your search.</p>
                    <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or search keywords.</p>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            <AnimatePresence mode="popLayout">
              {displayMeetings.map((meeting) => (
                <motion.tr
                  layout
                  key={meeting.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 350, damping: 35 }}
                  className="border-b border-border/50 hover:bg-muted/50 transition-colors"
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
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className="text-xs font-normal border-border bg-muted/50 text-foreground rounded-md"
                      >
                        {meeting.type}
                      </Badge>
                      {!meeting.summary && meeting.transcript && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/30 animate-pulse flex items-center gap-1"
                        >
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Summarizing...
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-3.5">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <Calendar className="h-4.5 w-4.5 text-muted-foreground/70" />
                      {meeting.date}
                    </span>
                  </TableCell>
                  <TableCell className="py-3.5">
                    <div className="flex flex-wrap gap-1 max-w-55 items-center">
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
                          +{meeting.participants.length - 2} more
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onTogglePin(meeting)}
                        disabled={pinningMeetingId === meeting.id}
                        className={`h-8 w-8 rounded-md ${
                          meeting.isPinned
                            ? "text-indigo-500 hover:bg-indigo-500/10"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                        title={meeting.isPinned ? "Unpin Meeting" : "Pin Meeting"}
                      >
                        {pinningMeetingId === meeting.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : meeting.isPinned ? (
                          <PinOff className="h-5 w-5" />
                        ) : (
                          <Pin className="h-5 w-5" />
                        )}
                      </Button>

                      <DropdownMenu
                        open={openMenuId === meeting.id}
                        onOpenChange={(open) => {
                          if (!open && IsCloneMeetingLoading) return;
                          setOpenMenuId(open ? meeting.id : null);
                        }}
                      >
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-md"
                            />
                          }
                        >
                          <MoreVertical className="h-4.5 w-4.5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => onViewDetails(meeting)}>
                            <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span>View Details</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(meeting)}>
                            <Edit className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span>Edit Meeting</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onViewDetails(meeting)}>
                            <Share2 className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span>Share Meeting</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled={meeting.isPinned} onClick={() => onArchive(meeting)}>
                            <Archive className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span>Archive</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem closeOnClick={false} onClick={() => handleCreatingClone(meeting)}>
                            <Copy className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span>Clone Meeting</span>
                            {IsCloneMeetingLoading ? (
                              <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />
                            ) : null}
                          </DropdownMenuItem>
                          {onAssignSeries && (
                            <DropdownMenuItem onClick={() => onAssignSeries(meeting)}>
                              <Repeat2 className="mr-2 h-4 w-4 text-indigo-500" />
                              <span>Assign to Series</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => onDelete(meeting)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </AnimatePresence>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
