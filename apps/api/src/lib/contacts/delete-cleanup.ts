import type { DomainSupabaseClient } from "../../domains/_shared/context.js";

export async function collectLinkedInLogoIds(
  client: DomainSupabaseClient,
  userId: string,
  personIds: string[],
): Promise<string[]> {
  if (personIds.length === 0) {
    return [];
  }

  const [workResult, eduResult] = await Promise.all([
    client
      .from("people_work_history")
      .select("company_linkedin_id")
      .eq("user_id", userId)
      .in("person_id", personIds)
      .not("company_linkedin_id", "is", null),
    client
      .from("people_education_history")
      .select("school_linkedin_id")
      .eq("user_id", userId)
      .in("person_id", personIds)
      .not("school_linkedin_id", "is", null),
  ]);

  const ids = new Set<string>();
  for (const row of workResult.data ?? []) {
    if (row.company_linkedin_id) {
      ids.add(row.company_linkedin_id);
    }
  }
  for (const row of eduResult.data ?? []) {
    if (row.school_linkedin_id) {
      ids.add(row.school_linkedin_id);
    }
  }
  return Array.from(ids);
}

export async function removeOrphanedLinkedInLogos(
  client: DomainSupabaseClient,
  userId: string,
  candidateIds: string[],
): Promise<void> {
  if (candidateIds.length === 0) {
    return;
  }

  const [workResult, eduResult] = await Promise.all([
    client
      .from("people_work_history")
      .select("company_linkedin_id")
      .eq("user_id", userId)
      .in("company_linkedin_id", candidateIds),
    client
      .from("people_education_history")
      .select("school_linkedin_id")
      .eq("user_id", userId)
      .in("school_linkedin_id", candidateIds),
  ]);

  const stillReferenced = new Set<string>();
  for (const row of workResult.data ?? []) {
    if (row.company_linkedin_id) {
      stillReferenced.add(row.company_linkedin_id);
    }
  }
  for (const row of eduResult.data ?? []) {
    if (row.school_linkedin_id) {
      stillReferenced.add(row.school_linkedin_id);
    }
  }

  const orphaned = candidateIds.filter((id) => !stillReferenced.has(id));
  if (orphaned.length === 0) {
    return;
  }

  const paths = orphaned.map((id) => `${userId}/${id}.jpg`);
  await client.storage.from("linkedin_logos").remove(paths);
}
