import { TimelineClient } from "./TimelineClient";
import { getTimelineData } from "./getTimelineData";

export default async function TimelinePage() {
  const { contacts, activities } = await getTimelineData();

  return <TimelineClient initialContacts={contacts} initialActivities={activities} />;
}
