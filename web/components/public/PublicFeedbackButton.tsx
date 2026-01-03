"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FeedbackModal } from "@/components/FeedbackModal";

export function PublicFeedbackButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        className="bg-white/10 text-white hover:bg-white/15 border border-white/10"
        onClick={() => setOpen(true)}
      >
        Feedback
      </Button>
      <FeedbackModal open={open} onClose={() => setOpen(false)} businessId={null} />
    </>
  );
}


