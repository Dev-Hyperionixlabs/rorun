-- Deduplicate existing evidence links (keep the lowest id per (taskId, documentId))
DELETE FROM "task_evidence_links" a
USING "task_evidence_links" b
WHERE a."taskId" = b."taskId"
  AND a."documentId" = b."documentId"
  AND a."id" > b."id";

-- Enforce uniqueness for evidence attachments
CREATE UNIQUE INDEX IF NOT EXISTS "task_evidence_links_taskId_documentId_key"
ON "task_evidence_links" ("taskId", "documentId");


