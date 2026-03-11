import { useEffect, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  IconArrowLeft,
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandWhatsapp,
  IconCalendar,
  IconChevronDown,
  IconChevronUp,
  IconClock,
  IconDotsVertical,
  IconMail,
  IconMapPin,
  IconMessage,
  IconPhone,
  IconWorld,
} from "@tabler/icons-react-native";
import type { Contact, EmailEntry, ImportantDate, PhoneEntry } from "@bondery/types";
import { fetchContact } from "../../lib/api/client";
import { ScalePressable } from "../../theme/ScalePressable";
import { formatContactName, getAvatarColorHex, getContactInitials } from "./contactUtils";

interface ContactDetailScreenProps {
  id: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeDate(dateStr: string): string {
  const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  const weeks = Math.floor(diffDays / 7);
  if (diffDays < 30) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  const months = Math.floor(diffDays / 30);
  if (diffDays < 365) return `${months} month${months > 1 ? "s" : ""} ago`;
  const years = Math.floor(diffDays / 365);
  return `${years} year${years > 1 ? "s" : ""} ago`;
}

function formatAbsoluteDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const DATE_LABELS: Record<string, string> = {
  birthday: "Birthday",
  anniversary: "Anniversary",
  nameday: "Name Day",
  graduation: "Graduation",
  other: "Important Date",
};

const SOCIAL_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  signal: "Signal",
  website: "Website",
};

function buildVCard(
  contact: Contact,
  phones: PhoneEntry[],
  emails: EmailEntry[],
  name: string,
): string {
  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${name}`,
    `N:${contact.lastName ?? ""};${contact.firstName ?? ""};${contact.middleName ?? ""};;`,
  ];

  phones.forEach((p) => {
    const type = p.type === "work" ? "WORK" : "HOME";
    lines.push(`TEL;TYPE=${type}:${p.prefix ?? ""}${p.value}`);
  });

  emails.forEach((e) => {
    const type = e.type === "work" ? "WORK" : "HOME";
    lines.push(`EMAIL;TYPE=${type}:${e.value}`);
  });

  if (contact.notes) {
    lines.push(`NOTE:${contact.notes.replace(/\n/g, "\\n")}`);
  }

  lines.push("END:VCARD");
  return lines.join("\n");
}

function buildSocialUrl(platform: string, handle: string): string {
  if (handle.startsWith("http")) return handle;
  switch (platform) {
    case "linkedin":
      return `https://linkedin.com/in/${handle}`;
    case "instagram":
      return `https://instagram.com/${handle}`;
    case "facebook":
      return `https://facebook.com/${handle}`;
    case "whatsapp":
      return `https://wa.me/${handle.replace(/\D/g, "")}`;
    case "signal":
      return `https://signal.me/#p/${handle}`;
    case "website":
      return `https://${handle}`;
    default:
      return handle;
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function SocialCard({
  platform,
  handle,
  onPress,
}: {
  platform: string;
  handle: string;
  onPress: () => void;
}) {
  const iconProps = { size: 18, stroke: "#6b7280" } as const;
  const icons: Record<string, React.ReactNode> = {
    linkedin: <IconBrandLinkedin {...iconProps} />,
    instagram: <IconBrandInstagram {...iconProps} />,
    facebook: <IconBrandFacebook {...iconProps} />,
    whatsapp: <IconBrandWhatsapp {...iconProps} />,
    signal: <IconMessage {...iconProps} />,
    website: <IconWorld {...iconProps} />,
  };

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardRow}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardPrimary}>{SOCIAL_LABELS[platform] ?? platform}</Text>
          <Text style={styles.cardSecondary} numberOfLines={1}>
            {handle}
          </Text>
        </View>
        {icons[platform] ?? null}
      </View>
    </Pressable>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function ContactDetailScreen({ id }: ContactDetailScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notesExpanded, setNotesExpanded] = useState(false);

  useEffect(() => {
    fetchContact(id)
      .then(({ contact: c }) => setContact(c))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load contact"))
      .finally(() => setLoading(false));
  }, [id]);

  const navBarStyle = { paddingTop: insets.top + 8, paddingBottom: 8 };

  function shareContact() {
    if (!contact) return;
    const vCard = buildVCard(contact, phones, emails, name);
    Share.share({ title: name, message: vCard }).catch(() => {});
  }

  function showMenu() {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancel", "Share contact"], cancelButtonIndex: 0 },
        (index) => {
          if (index === 1) shareContact();
        },
      );
    } else {
      Alert.alert(name, undefined, [
        { text: "Share contact", onPress: shareContact },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  }

  if (loading || error || !contact) {
    return (
      <View style={styles.screen}>
        <View style={[styles.navBar, navBarStyle]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
            <IconArrowLeft size={22} stroke="#111827" />
          </Pressable>
        </View>
        <View style={styles.centered}>
          {loading ? (
            <ActivityIndicator size="large" color="#111827" />
          ) : (
            <Text style={styles.errorText}>{error ?? "Contact not found"}</Text>
          )}
        </View>
      </View>
    );
  }

  const phones = (contact.phones as PhoneEntry[] | null) ?? [];
  const emails = (contact.emails as EmailEntry[] | null) ?? [];
  const importantDates = (contact.importantDates as ImportantDate[] | null) ?? [];
  const initials = getContactInitials(contact);
  const avatarColor = getAvatarColorHex(contact);
  const name = formatContactName(contact);

  const primaryPhone = phones.find((p) => p.preferred) ?? phones[0];
  const primaryEmail = emails.find((e) => e.preferred) ?? emails[0];

  const socialPlatforms = (
    ["linkedin", "instagram", "facebook", "whatsapp", "signal", "website"] as const
  ).filter((p) => Boolean(contact[p]));

  function openPhone(phone: PhoneEntry) {
    Linking.openURL(`tel:${phone.prefix}${phone.value}`).catch(() =>
      Alert.alert("Error", "Could not open phone dialer"),
    );
  }

  function openSms(phone: PhoneEntry) {
    Linking.openURL(`sms:${phone.prefix}${phone.value}`).catch(() =>
      Alert.alert("Error", "Could not open messages"),
    );
  }

  function openEmail(email: EmailEntry) {
    Linking.openURL(`mailto:${email.value}`).catch(() =>
      Alert.alert("Error", "Could not open email app"),
    );
  }

  function openSocial(platform: string, handle: string) {
    Linking.openURL(buildSocialUrl(platform, handle)).catch(() =>
      Alert.alert("Error", "Could not open link"),
    );
  }

  function openAddress() {
    if (!contact) return;
    const addr = contact.addressFormatted ?? contact.place;
    if (!addr) return;
    const query = encodeURIComponent(addr);
    const url = Platform.OS === "ios" ? `maps:?q=${query}` : `geo:0,0?q=${query}`;
    Linking.openURL(url).catch(() => Linking.openURL(`https://maps.google.com?q=${query}`));
  }

  const hasAddress = Boolean(contact.addressFormatted ?? contact.place);
  const hasInfo = Boolean(contact.lastInteraction) || importantDates.length > 0 || hasAddress;
  const hasSocial = socialPlatforms.length > 0;
  const longNotes = (contact.notes?.length ?? 0) > 200;

  return (
    <View style={styles.screen}>
      {/* ── Nav bar ── */}
      <View style={[styles.navBar, navBarStyle]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <IconArrowLeft size={22} stroke="#111827" />
        </Pressable>
        <Pressable onPress={showMenu} hitSlop={12} style={styles.menuButton}>
          <IconDotsVertical size={22} stroke="#111827" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={[styles.avatarCircle, !contact.avatar && { backgroundColor: avatarColor }]}>
            {contact.avatar ? (
              <Image
                source={{ uri: contact.avatar }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.avatarInitial}>{initials}</Text>
            )}
          </View>
          <Text style={styles.heroName}>{name}</Text>
          {contact.headline ? <Text style={styles.heroHeadline}>{contact.headline}</Text> : null}
          {contact.place ? <Text style={styles.heroPlace}>{contact.place}</Text> : null}
        </View>

        {/* ── Quick Actions ── */}
        {phones.length > 0 || emails.length > 0 || contact.whatsapp ? (
          <View style={styles.quickActions}>
            {phones.length > 0 ? (
              <ScalePressable style={styles.actionButton} onPress={() => openPhone(primaryPhone!)}>
                <View style={styles.actionIcon}>
                  <IconPhone size={20} stroke="#111827" />
                </View>
              </ScalePressable>
            ) : null}
            {phones.length > 0 ? (
              <ScalePressable style={styles.actionButton} onPress={() => openSms(primaryPhone!)}>
                <View style={styles.actionIcon}>
                  <IconMessage size={20} stroke="#111827" />
                </View>
              </ScalePressable>
            ) : null}
            {emails.length > 0 ? (
              <ScalePressable style={styles.actionButton} onPress={() => openEmail(primaryEmail!)}>
                <View style={styles.actionIcon}>
                  <IconMail size={20} stroke="#111827" />
                </View>
              </ScalePressable>
            ) : null}
            {contact.whatsapp ? (
              <ScalePressable
                style={styles.actionButton}
                onPress={() => openSocial("whatsapp", contact.whatsapp!)}
              >
                <View style={styles.actionIcon}>
                  <IconBrandWhatsapp size={20} stroke="#111827" />
                </View>
              </ScalePressable>
            ) : null}
          </View>
        ) : null}

        {/* ── Phones ── */}
        {phones.length > 0 ? (
          <View style={styles.section}>
            <SectionTitle title="Phone" />
            {phones.map((phone, i) => (
              <Pressable key={i} style={styles.card} onPress={() => openPhone(phone)}>
                <View style={styles.cardRow}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.cardPrimary}>
                      {phone.prefix} {phone.value}
                    </Text>
                    <View style={styles.badgeRow}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{phone.type}</Text>
                      </View>
                      {phone.preferred ? (
                        <View style={[styles.badge, styles.badgeDefault]}>
                          <Text style={[styles.badgeText, styles.badgeDefaultText]}>default</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <IconPhone size={16} stroke="#9ca3af" />
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* ── Emails ── */}
        {emails.length > 0 ? (
          <View style={styles.section}>
            <SectionTitle title="Email" />
            {emails.map((email, i) => (
              <Pressable key={i} style={styles.card} onPress={() => openEmail(email)}>
                <View style={styles.cardRow}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.cardPrimary}>{email.value}</Text>
                    <View style={styles.badgeRow}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{email.type}</Text>
                      </View>
                      {email.preferred ? (
                        <View style={[styles.badge, styles.badgeDefault]}>
                          <Text style={[styles.badgeText, styles.badgeDefaultText]}>default</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <IconMail size={16} stroke="#9ca3af" />
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* ── Social Media ── */}
        {hasSocial ? (
          <View style={styles.section}>
            <SectionTitle title="Social media" />
            {socialPlatforms.map((platform) => (
              <SocialCard
                key={platform}
                platform={platform}
                handle={contact[platform]!}
                onPress={() => openSocial(platform, contact[platform]!)}
              />
            ))}
          </View>
        ) : null}

        {/* ── Notes ── */}
        {contact.notes ? (
          <View style={styles.section}>
            <SectionTitle title="Notes" />
            <View style={styles.card}>
              <Text style={styles.notesText} numberOfLines={notesExpanded ? undefined : 4}>
                {contact.notes}
              </Text>
              {longNotes ? (
                <Pressable
                  style={styles.showMoreButton}
                  onPress={() => setNotesExpanded((v) => !v)}
                >
                  {notesExpanded ? (
                    <IconChevronUp size={14} stroke="#6b7280" />
                  ) : (
                    <IconChevronDown size={14} stroke="#6b7280" />
                  )}
                  <Text style={styles.showMoreText}>
                    {notesExpanded ? "Show less" : "Show more"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* ── Info ── */}
        {hasInfo ? (
          <View style={styles.section}>
            <SectionTitle title="Info" />

            {contact.lastInteraction ? (
              <View style={styles.card}>
                <View style={styles.infoRow}>
                  <IconClock size={16} stroke="#6b7280" />
                  <View style={styles.infoTexts}>
                    <Text style={styles.infoLabel}>Last interaction</Text>
                    <Text style={styles.infoValue}>
                      {formatRelativeDate(contact.lastInteraction)} ·{" "}
                      {formatAbsoluteDate(contact.lastInteraction)}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {importantDates.map((d, i) => (
              <View key={i} style={styles.card}>
                <View style={styles.infoRow}>
                  <IconCalendar size={16} stroke="#6b7280" />
                  <View style={styles.infoTexts}>
                    <Text style={styles.infoLabel}>{DATE_LABELS[d.type] ?? d.type}</Text>
                    <Text style={styles.infoValue}>{formatAbsoluteDate(d.date)}</Text>
                    {d.note ? <Text style={styles.infoNote}>{d.note}</Text> : null}
                  </View>
                </View>
              </View>
            ))}

            {hasAddress ? (
              <Pressable style={styles.card} onPress={openAddress}>
                <View style={styles.infoRow}>
                  <IconMapPin size={16} stroke="#6b7280" />
                  <View style={styles.infoTexts}>
                    <Text style={styles.infoLabel}>Address</Text>
                    <Text style={styles.infoValue}>
                      {contact.addressFormatted ?? contact.place}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={{ height: insets.bottom + 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  navBar: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    padding: 4,
  },
  menuButton: {
    padding: 4,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#ef4444",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },

  // Hero
  hero: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 6,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    overflow: "hidden",
  },
  avatarImage: {
    width: 88,
    height: 88,
  },
  avatarInitial: {
    fontSize: 30,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 1,
  },
  heroName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  heroHeadline: {
    fontSize: 14,
    color: "#374151",
    textAlign: "center",
  },
  heroPlace: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
  },

  // Quick actions
  quickActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    marginBottom: 24,
  },
  actionButton: {
    alignItems: "center",
    gap: 6,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
  },

  // Sections
  section: {
    marginBottom: 24,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },

  // Cards
  card: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardLeft: {
    flex: 1,
    gap: 4,
  },
  cardPrimary: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  cardSecondary: {
    fontSize: 13,
    color: "#6b7280",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#374151",
    textTransform: "capitalize",
  },
  badgeDefault: {
    backgroundColor: "#dbeafe",
  },
  badgeDefaultText: {
    color: "#1d4ed8",
  },

  // Notes
  notesText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  showMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
  },
  showMoreText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
  },

  // Info rows
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  infoTexts: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  infoNote: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
});
