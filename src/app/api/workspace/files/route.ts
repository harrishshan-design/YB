import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ApiError, respondToError } from "@/lib/auth";
import { workspaceContext, readWorkspace } from "@/lib/product/server";
import { canManage, canProgramme } from "@/lib/product/types";
import { getPlan } from "@/lib/product/plans";
import { db } from "@/lib/db";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
const bucket = () => process.env.SUPABASE_STORAGE_BUCKET ?? "documents";
export async function GET(request: Request) {
  try {
    const c = await workspaceContext(request);
    const id = new URL(request.url).searchParams.get("id") ?? "";
    const document = await db.document.findFirst({
      where: { id, organisationId: c.organisationId, status: "ACTIVE" },
    });
    if (
      !document ||
      (!canManage(c.role) && c.role !== "COMMITTEE" && !canProgramme(c.role))
    )
      throw new ApiError(404, "Document not found.");
    if (
      !canManage(c.role) &&
      ["Finance", "Membership"].includes(document.ownerType)
    )
      throw new ApiError(403, "This document is restricted.");
    const { data, error } = await getSupabaseAdminClient()
      .storage.from(bucket())
      .createSignedUrl(document.storageKey, 120);
    if (error)
      throw new ApiError(
        503,
        "This document couldn't be opened. Check the organisation's storage setup.",
      );
    return NextResponse.json(
      { url: data.signedUrl },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return respondToError(error);
  }
}
export async function POST(request: Request) {
  try {
    const c = await workspaceContext(request);
    const form = await request.formData();
    const file = form.get("file");
    const programmeId = String(form.get("programmeId") ?? "");
    if (!(file instanceof File) || file.size > 10 * 1024 * 1024)
      throw new ApiError(400, "Choose a file up to 10 MB.");
    if (programmeId ? !canProgramme(c.role) : !canManage(c.role))
      throw new ApiError(403, "You don't have upload permission.");
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "text/plain",
      "text/csv",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowed.includes(file.type))
      throw new ApiError(
        400,
        "Choose a PDF, image, text, CSV or Word document.",
      );
    const bytes = Buffer.from(await file.arrayBuffer());
    if (
      (file.type === "image/png" &&
        bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") ||
      (file.type === "image/jpeg" &&
        bytes.subarray(0, 3).toString("hex") !== "ffd8ff") ||
      (file.type === "application/pdf" &&
        bytes.subarray(0, 5).toString() !== "%PDF-")
    )
      throw new ApiError(400, "This file doesn't match its file type.");
    const key = `${c.organisationId}/${crypto.randomUUID()}/${file.name.replace(/[^a-z0-9._-]/gi, "_")}`;
    const storage = getSupabaseAdminClient().storage.from(bucket());
    let uploaded = false;
    try {
      await db.$transaction(
        async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${c.organisationId}))`;
          const data = await readWorkspace(c);
          if (
            data.subscription.storageBytes + file.size >
            getPlan(data.subscription.plan).storage * 1e9
          )
            throw new ApiError(403, "Your plan's storage allowance is full.");
          if (programmeId && !data.programmes.some((p) => p.id === programmeId))
            throw new ApiError(404, "Programme not found.");
          if (programmeId && !["image/jpeg", "image/png"].includes(file.type))
            throw new ApiError(
              400,
              "Programme photos must be JPEG or PNG images.",
            );
          const result = await storage.upload(key, bytes, {
            contentType: file.type,
            upsert: false,
          });
          if (result.error)
            throw new ApiError(
              503,
              "File storage is not available. Check the private documents bucket.",
            );
          uploaded = true;
          await tx.document.create({
            data: {
              organisationId: c.organisationId,
              ownerType: programmeId
                ? "Programme photos"
                : String(form.get("category") ?? "General"),
              ownerId: programmeId || c.organisationId,
              storageKey: key,
              fileName: file.name,
              contentType: file.type,
              size: file.size,
              createdBy: c.user.id,
            },
          });
          if (programmeId) {
            const programme = await tx.programme.findUniqueOrThrow({
              where: { id: programmeId },
            });
            const details =
              (programme.details as Record<string, Prisma.JsonValue>) ?? {};
            const photos = Array.isArray(details.photos) ? details.photos : [];
            await tx.programme.update({
              where: { id: programmeId },
              data: {
                details: {
                  ...details,
                  photos: [
                    ...photos,
                    `/api/workspace/photo?organisationId=${c.organisationId}&key=${encodeURIComponent(key)}`,
                  ],
                },
              },
            });
          }
          await tx.auditLog.create({
            data: {
              organisationId: c.organisationId,
              actorId: c.user.id,
              action: "Document uploaded",
              entityType: "document",
              metadata: { fileName: file.name },
            },
          });
        },
        { timeout: 30000 },
      );
    } catch (error) {
      if (uploaded) await storage.remove([key]);
      throw error;
    }
    return NextResponse.json({ message: "File uploaded." });
  } catch (error) {
    return respondToError(error);
  }
}
