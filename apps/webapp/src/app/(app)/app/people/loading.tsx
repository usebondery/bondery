import { PeoplePageSkeleton } from "./components/chrome/PeopleSkeletons";

/**
 * Route-level loading UI for the People page.
 * Next.js renders this automatically during navigation and hard reloads,
 * replacing the generic app/loading.tsx with a layout that matches the
 * actual page structure - no jarring shape changes when data arrives.
 */
export default function PeopleLoading() {
  return <PeoplePageSkeleton />;
}
