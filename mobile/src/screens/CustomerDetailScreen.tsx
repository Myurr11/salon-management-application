import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useData } from "../context/DataContext";
import type { Customer, Visit } from "../types";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const D = {
  bg: "#F7F9FB",
  surface: "#FFFFFF",
  surfaceAlt: "#F2F4F6",

  green: "#166534",
  greenMuted: "rgba(22,101,52,0.10)",
  greenBorder: "rgba(22,101,52,0.25)",

  border: "#E8EAEC",

  text: "#191C1E",
  textSub: "#707A6F",
  textMuted: "#9AA09E",

  red: "#BA1A1A",
  redMuted: "rgba(186,26,26,0.08)",
  redBorder: "rgba(186,26,26,0.20)",

  blue: "#1B5FA6",
  blueMuted: "rgba(27,95,166,0.10)",
  blueBorder: "rgba(27,95,166,0.25)",

  amber: "#B8742A",
  amberMuted: "rgba(184,116,42,0.10)",
  amberBorder: "rgba(184,116,42,0.25)",

  radius: { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, pill: 999 },
};

interface Props {
  navigation?: any;
  route?: { params?: { customerId?: string } };
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────
const SectionLabel = ({ children }: { children: string }) => (
  <View style={sl.row}>
    <View style={sl.line} />
    <Text style={sl.text}>{children}</Text>
    <View style={sl.line} />
  </View>
);
const sl = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  line: { flex: 1, height: 1, backgroundColor: D.border },
  text: {
    fontSize: 10,
    fontWeight: "700",
    color: D.textSub,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
});

export const CustomerDetailScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const { customers, visits } = useData();
  const customerId = route?.params?.customerId;

  const customer = useMemo(
    () =>
      customerId
        ? customers.find((c: any) => c.id === customerId)
        : undefined,
    [customers, customerId],
  );
  const customerVisits = useMemo(
    () =>
      customerId
        ? visits
            .filter((v: any) => v.customerId === customerId)
            .sort((a: any, b: any) => (b.date > a.date ? 1 : -1))
        : [],
    [visits, customerId],
  );
  const totalSpend = useMemo(
    () => customerVisits.reduce((s: number, v: any) => s + v.total, 0),
    [customerVisits],
  );
  const avgSpend =
    customerVisits.length > 0 ? totalSpend / customerVisits.length : 0;
  const lastVisit = customerVisits[0];

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const initials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  if (!customer) {
    return (
      <View style={[s.center, { flex: 1, backgroundColor: D.bg }]}>
        <View style={s.emptyIconBox}>
          <MaterialCommunityIcons
            name="account-off-outline"
            size={32}
            color={D.textMuted}
          />
        </View>
        <Text style={s.emptyTitle}>Customer not found</Text>
      </View>
    );
  }

  // Contact rows
  const contactRows: Array<{ icon: string; label: string; value: string }> =
    [];
  if (customer.phone)
    contactRows.push({ icon: "phone-outline", label: "Phone", value: customer.phone });
  if (customer.email)
    contactRows.push({ icon: "email-outline", label: "Email", value: customer.email });
  if (customer.dob)
    contactRows.push({
      icon: "cake-variant-outline",
      label: "Date of Birth",
      value: formatDate(customer.dob),
    });
  if (customer.gender)
    contactRows.push({
      icon: "gender-male-female",
      label: "Gender",
      value: customer.gender.charAt(0).toUpperCase() + customer.gender.slice(1),
    });
  if (customer.address)
    contactRows.push({
      icon: "map-marker-outline",
      label: "Address",
      value: customer.address,
    });

  return (
    <View style={s.root}>
      {/* ── Top Bar ── */}
      <View style={s.topBar}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation?.goBack()}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={20}
            color={D.text}
          />
        </TouchableOpacity>
        <Text style={s.topBarTitle}>Client Details</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Profile Card ── */}
        <View style={s.heroCard}>
          <View style={s.heroAvatar}>
            <Text style={s.heroAvatarText}>{initials(customer.name)}</Text>
          </View>
          <Text style={s.heroName}>{customer.name}</Text>
          {customer.phone && (
            <View style={s.heroPill}>
              <MaterialCommunityIcons
                name="phone-outline"
                size={12}
                color={D.green}
              />
              <Text style={s.heroPillText}>{customer.phone}</Text>
            </View>
          )}
          {lastVisit && (
            <View style={[s.heroPill, s.heroPillAmber]}>
              <MaterialCommunityIcons
                name="calendar-check"
                size={12}
                color={D.amber}
              />
              <Text style={[s.heroPillText, { color: D.amber }]}>
                Last visit {formatDate(lastVisit.date)}
              </Text>
            </View>
          )}
        </View>

        {/* ── Stats Band ── */}
        <View style={s.statsBand}>
          <View style={s.statBlock}>
            <Text style={s.statVal}>{customerVisits.length}</Text>
            <Text style={s.statLabel}>Total Visits</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBlock}>
            <Text style={s.statVal}>₹{totalSpend.toFixed(0)}</Text>
            <Text style={s.statLabel}>Lifetime Spend</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBlock}>
            <Text style={s.statVal}>₹{avgSpend.toFixed(0)}</Text>
            <Text style={s.statLabel}>Avg Bill</Text>
          </View>
        </View>

        {/* ── Body ── */}
        <View style={s.body}>
          {/* Contact Details */}
          <SectionLabel>CONTACT DETAILS</SectionLabel>
          <View style={s.card}>
            {contactRows.length === 0 ? (
              <View style={s.emptyInCard}>
                <MaterialCommunityIcons
                  name="information-outline"
                  size={16}
                  color={D.textMuted}
                />
                <Text style={s.emptyInCardText}>No contact details saved</Text>
              </View>
            ) : (
              contactRows.map((row, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === contactRows.length - 1;
                return (
                  <View
                    key={row.label}
                    style={[
                      ir.row,
                      isFirst && { borderTopWidth: 0 },
                      isLast && { borderBottomWidth: 0 },
                    ]}
                  >
                    <View style={ir.iconBox}>
                      <MaterialCommunityIcons
                        name={row.icon as any}
                        size={15}
                        color={D.textMuted}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={ir.label}>{row.label}</Text>
                      <Text style={ir.value}>{row.value}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* Visit History */}
          <View style={s.sectionHeaderRow}>
            <View style={{ flex: 1 }}>
              <SectionLabel>VISIT HISTORY</SectionLabel>
            </View>
          </View>

          {customerVisits.length === 0 ? (
            <View style={s.emptyCard}>
              <View style={s.emptyIconBox}>
                <MaterialCommunityIcons
                  name="calendar-blank-outline"
                  size={32}
                  color={D.textMuted}
                />
              </View>
              <Text style={s.emptyTitle}>No visits yet</Text>
              <Text style={s.emptyHint}>
                This customer hasn't visited yet
              </Text>
            </View>
          ) : (
            customerVisits.map((v: Visit, index: number) => {
              const serviceNames = v.services
                .map((sv: any) => sv.serviceName || sv.name)
                .filter(Boolean);
              const hasProducts = v.products && v.products.length > 0;
              const isFirst = index === 0;
              const isLast = index === customerVisits.length - 1;

              return (
                <TouchableOpacity
                  key={v.id}
                  style={[
                    cr.row,
                    isFirst && cr.rowFirst,
                    isLast && cr.rowLast,
                  ]}
                  onPress={() =>
                    navigation?.navigate("BillView", { visitId: v.id })
                  }
                  activeOpacity={0.8}
                >
                  {/* Avatar block — staff initials */}
                  <View style={cr.avatar}>
                    <Text style={cr.avatarText}>
                      {initials(v.staffName || "?")}
                    </Text>
                  </View>

                  {/* Body */}
                  <View style={cr.body}>
                    <View style={cr.nameRow}>
                      <Text style={cr.name} numberOfLines={1}>
                        {v.staffName}
                      </Text>
                      {isFirst && (
                        <View style={cr.latestBadge}>
                          <Text style={cr.latestText}>Latest</Text>
                        </View>
                      )}
                    </View>

                    <View style={cr.metaRow}>
                      <View style={cr.metaItem}>
                        <MaterialCommunityIcons
                          name="calendar-outline"
                          size={11}
                          color={D.textMuted}
                        />
                        <Text style={cr.metaText}>{formatDate(v.date)}</Text>
                      </View>
                      <View style={cr.metaSep} />
                      <View style={cr.metaItem}>
                        <MaterialCommunityIcons
                          name="currency-inr"
                          size={11}
                          color={D.textMuted}
                        />
                        <Text style={cr.metaText}>₹{v.total.toFixed(0)}</Text>
                      </View>
                      {serviceNames.length > 0 && (
                        <>
                          <View style={cr.metaSep} />
                          <View style={cr.metaItem}>
                            <MaterialCommunityIcons
                              name="spa"
                              size={11}
                              color={D.textMuted}
                            />
                            <Text style={cr.metaText} numberOfLines={1}>
                              {serviceNames.slice(0, 2).join(", ")}
                              {serviceNames.length > 2
                                ? ` +${serviceNames.length - 2}`
                                : ""}
                            </Text>
                          </View>
                        </>
                      )}
                    </View>

                    {hasProducts && (
                      <View style={cr.productsRow}>
                        <MaterialCommunityIcons
                          name="package-variant"
                          size={11}
                          color={D.amber}
                        />
                        <Text style={cr.productsText}>
                          {v.products.length} product
                          {v.products.length > 1 ? "s" : ""} sold
                        </Text>
                      </View>
                    )}
                  </View>

                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={16}
                    color={D.textMuted}
                  />
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
};

// ─── Info row styles (contact card) ───────────────────────────────────────────
const ir = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F4",
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: D.radius.sm,
    backgroundColor: D.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 10,
    color: D.textMuted,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  value: { fontSize: 13, fontWeight: "600", color: D.text },
});

// ─── Visit row styles — same compact pattern as CustomerListScreen ────────────
const cr = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F4",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: D.border,
  },
  rowFirst: {
    borderTopWidth: 1,
    borderTopLeftRadius: D.radius.xl,
    borderTopRightRadius: D.radius.xl,
  },
  rowLast: {
    borderBottomWidth: 1,
    borderBottomColor: D.border,
    borderBottomLeftRadius: D.radius.xl,
    borderBottomRightRadius: D.radius.xl,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: D.green,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  body: { flex: 1, minWidth: 0, gap: 3 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    fontSize: 13.5,
    fontWeight: "700",
    color: D.text,
    flexShrink: 1,
  },
  latestBadge: {
    backgroundColor: D.greenMuted,
    borderRadius: D.radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: D.greenBorder,
  },
  latestText: {
    fontSize: 9,
    fontWeight: "800",
    color: D.green,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, color: D.textSub, fontWeight: "500" },
  metaSep: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: D.border,
  },
  productsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  productsText: {
    fontSize: 10,
    fontWeight: "600",
    color: D.amber,
  },
});

// ─── Main Styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.bg },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },

  // Top bar
  topBar: {
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...Platform.select({
      ios: { paddingTop: 56 },
      android: { paddingTop: 14 },
    }),
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: D.radius.md,
    backgroundColor: D.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: D.text,
    letterSpacing: -0.3,
  },

  scrollContent: { paddingBottom: 40 },

  // Hero card
  heroCard: {
    backgroundColor: D.surface,
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
    alignItems: "center",
    gap: 8,
  },
  heroAvatar: {
    width: 72,
    height: 72,
    borderRadius: D.radius.lg,
    backgroundColor: D.green,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroAvatarText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  heroName: {
    fontSize: 20,
    fontWeight: "800",
    color: D.text,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: D.greenMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: D.radius.pill,
    borderWidth: 1,
    borderColor: D.greenBorder,
  },
  heroPillAmber: {
    backgroundColor: D.amberMuted,
    borderColor: D.amberBorder,
  },
  heroPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: D.green,
  },

  // Stats band
  statsBand: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: D.surface,
    borderBottomWidth: 1,
    borderBottomColor: D.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  statBlock: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statDivider: { width: 1, height: 36, backgroundColor: D.border },
  statVal: {
    fontSize: 16,
    fontWeight: "800",
    color: D.text,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 9,
    color: D.textMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    textAlign: "center",
  },

  // Body
  body: { paddingHorizontal: 16, paddingTop: 20 },

  // Cards
  card: {
    backgroundColor: D.surface,
    borderRadius: D.radius.xl,
    borderWidth: 1,
    borderColor: D.border,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 8,
  },
  emptyInCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  emptyInCardText: { fontSize: 13, color: D.textMuted },

  // Section header row (label + total pill)
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: -5,
  },
  manageBtn: {
    backgroundColor: D.greenMuted,
    borderWidth: 1,
    borderColor: D.greenBorder,
    borderRadius: D.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 0,
  },
  manageBtnText: {
    color: D.green,
    fontSize: 11,
    fontWeight: "700",
  },

  // Visit empty
  emptyCard: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
    backgroundColor: D.surface,
    borderRadius: D.radius.xl,
    borderWidth: 1,
    borderColor: D.border,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: D.radius.xl,
    backgroundColor: D.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: D.border,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: D.text,
    marginBottom: 6,
  },
  emptyHint: {
    fontSize: 13,
    color: D.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
});
