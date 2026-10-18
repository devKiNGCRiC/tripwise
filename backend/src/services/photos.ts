/**
 * photos.ts — journal photo storage. (Filled in by the journal work; for now only the
 * clean-up hook that deleting an account calls.)
 */

/** Remove every journal photo a traveller owns (used when their account is deleted). */
export async function deletePhotosOf(_userId: string): Promise<void> {
  // Nothing stored yet.
}
