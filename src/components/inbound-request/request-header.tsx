"use client";

import { EditInboundRequestDialog } from "@/components/assets/edit-inbound-request-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { InboundRequestDetails, InboundRequestStatus } from "@/types/inbound-request";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Package, Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const STATUS_COLORS: Record<InboundRequestStatus, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  APPROVED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  IN_PROGRESS: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  CANCELLED: "bg-red-500/10 text-red-500 border-red-500/20",
};

const STATUS_LABELS: Record<InboundRequestStatus, string> = {
  PENDING: "Pending Review",
  APPROVED: "Approved",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const STATUS_DESCRIPTIONS: Record<InboundRequestStatus, string> = {
  PENDING: "Your request is awaiting review by our team.",
  APPROVED: "Request has been approved and will be processed.",
  IN_PROGRESS: "Items are currently being processed.",
  COMPLETED: "All items have been successfully processed.",
  CANCELLED: "This request has been cancelled.",
};

interface RequestHeaderProps {
  requestId: string;
  status: InboundRequestStatus;
  createdAt: string;
  request: InboundRequestDetails;
  onRefresh: () => void;
}

export function RequestHeader({
  requestId,
  status,
  createdAt,
  request,
  onRefresh,
}: RequestHeaderProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  return (
    <>
      {/* Breadcrumb with Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <Link
          href="/assets-inbound"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 font-mono"
        >
          <ArrowLeft className="w-4 h-4" />
          Inbound Requests
        </Link>

        {/* Action Buttons */}

        <Button
          variant="outline"
          onClick={() => setEditDialogOpen(true)}
          className="font-mono gap-2"
        >
          <Pencil className="w-4 h-4" />
          Edit
        </Button>

      </motion.div>

      {/* Status Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <Card className="p-8 bg-card/50 backdrop-blur-sm border-border/40 overflow-hidden relative">
          <div className="flex items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <Badge
                  variant="outline"
                  className={`font-mono text-xs border ${STATUS_COLORS[status] || "bg-muted border-muted"}`}
                >
                  {status.replace(/_/g, " ")}
                </Badge>
                <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Submitted {new Date(createdAt).toLocaleDateString()}
                </span>
              </div>
              <h1 className="text-4xl font-bold mb-2">
                {STATUS_LABELS[status] || "Request Status"}
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                {STATUS_DESCRIPTIONS[status] || "Processing your request."}
              </p>
            </div>

            <div
              className={`w-20 h-20 rounded-xl flex items-center justify-center shrink-0 ${status === "COMPLETED"
                ? "bg-emerald-500"
                : status === "CANCELLED"
                  ? "bg-destructive"
                  : status === "APPROVED"
                    ? "bg-blue-500"
                    : status === "IN_PROGRESS"
                      ? "bg-purple-500"
                      : "bg-yellow-500"
                }`}
            >
              <Package className="w-10 h-10 text-white" />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Edit Dialog */}
      <EditInboundRequestDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={() => {
          setEditDialogOpen(false);
          onRefresh();
        }}
        request={request}
      />
    </>
  );
}
