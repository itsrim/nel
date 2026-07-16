import { useMemo, useState } from "react";
import { Search, Award } from "lucide-react";
import { ProfileBadgesSection } from "./ProfileBadgesSection";
import { useTranslation } from "../i18n/useTranslation";
import { resolveAvatarUrl } from "../lib/avatarUrl";
import type { Friend, SuggestionProfile } from "../data/mockData";
import "./AdminBadgesPanel.css";

type PersonRow = {
  id: string;
  name: string;
  age: number | null;
  imageUrl: string;
  badges: string[];
  isSelf: boolean;
};

type AdminBadgesPanelProps = {
  selfId: string | undefined;
  selfName: string;
  selfAge: number | null;
  selfAvatarUrl: string;
  selfBadges: string[];
  onChangeSelfBadges: (badges: string[]) => void;
  friends: Friend[];
  suggestions: SuggestionProfile[];
  catalog: string[];
  onChangeCatalog: (badges: string[]) => void;
  onChangePersonBadges: (profilId: string, badges: string[]) => void;
};

function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function AdminBadgesPanel({
  selfId,
  selfName,
  selfAge,
  selfAvatarUrl,
  selfBadges,
  onChangeSelfBadges,
  friends,
  suggestions,
  catalog,
  onChangeCatalog,
  onChangePersonBadges,
}: AdminBadgesPanelProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const people = useMemo((): PersonRow[] => {
    const byId = new Map<string, PersonRow>();

    if (selfId) {
      byId.set(selfId, {
        id: selfId,
        name: selfName.trim() || t("adminBadgesSelfLabel"),
        age: selfAge,
        imageUrl: resolveAvatarUrl(selfAvatarUrl),
        badges: selfBadges,
        isSelf: true,
      });
    }

    for (const f of friends) {
      const id = f.profilId?.trim();
      if (!id || byId.has(id)) continue;
      byId.set(id, {
        id,
        name: (f.pseudo || f.name || id).trim(),
        age: f.age,
        imageUrl: resolveAvatarUrl(f.imageUrl),
        badges: Array.isArray(f.badges) ? f.badges : [],
        isSelf: false,
      });
    }

    for (const s of suggestions) {
      const id = s.id?.trim();
      if (!id || byId.has(id)) continue;
      byId.set(id, {
        id,
        name: (s.pseudo || id).trim(),
        age: s.age,
        imageUrl: resolveAvatarUrl(s.imageUrl),
        badges: [],
        isSelf: false,
      });
    }

    return [...byId.values()].sort((a, b) => {
      if (a.isSelf !== b.isSelf) return a.isSelf ? -1 : 1;
      return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
    });
  }, [
    selfId,
    selfName,
    selfAge,
    selfAvatarUrl,
    selfBadges,
    friends,
    suggestions,
    t,
  ]);

  const filtered = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return people;
    return people.filter(
      (p) => fold(p.name).includes(q) || fold(p.id).includes(q),
    );
  }, [people, query]);

  /** Badges à jour pour la personne sélectionnée (self / friend). */
  const selectedLive = useMemo(() => {
    if (!selectedId) return null;
    if (selfId && selectedId === selfId) {
      return {
        id: selfId,
        name: selfName.trim() || t("adminBadgesSelfLabel"),
        age: selfAge,
        imageUrl: resolveAvatarUrl(selfAvatarUrl),
        badges: selfBadges,
        isSelf: true,
      } satisfies PersonRow;
    }
    const f = friends.find((x) => x.profilId === selectedId);
    if (f) {
      return {
        id: f.profilId,
        name: (f.pseudo || f.name || f.profilId).trim(),
        age: f.age,
        imageUrl: resolveAvatarUrl(f.imageUrl),
        badges: Array.isArray(f.badges) ? f.badges : [],
        isSelf: false,
      } satisfies PersonRow;
    }
    return people.find((p) => p.id === selectedId) ?? null;
  }, [
    selectedId,
    selfId,
    selfName,
    selfAge,
    selfAvatarUrl,
    selfBadges,
    friends,
    people,
    t,
  ]);

  return (
    <div className="admin-badges-panel">
      <section className="admin-badges-block">
        <h3 className="admin-badges-heading">{t("adminBadgesCatalogHeading")}</h3>
        <p className="admin-badges-sub">{t("adminBadgesCatalogSub")}</p>
        <ProfileBadgesSection
          badges={[]}
          suggestions={catalog}
          editable
          manageSuggestions
          catalogOnly
          onSuggestionsChange={onChangeCatalog}
        />
      </section>

      <section className="admin-badges-block">
        <h3 className="admin-badges-heading">{t("adminBadgesAssignHeading")}</h3>
        <p className="admin-badges-sub">{t("adminBadgesAssignSub")}</p>

        <label className="admin-badges-search">
          <Search size={18} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("adminBadgesSearchPlaceholder")}
            aria-label={t("adminBadgesSearchPlaceholder")}
          />
        </label>

        <div className="admin-badges-people" role="listbox" aria-label={t("adminBadgesPeopleLabel")}>
          {filtered.length === 0 ? (
            <p className="admin-badges-empty">{t("adminBadgesNoPeople")}</p>
          ) : (
            filtered.map((p) => {
              const active = p.id === selectedId;
              const badgeCount = p.isSelf
                ? selfBadges.length
                : friends.find((f) => f.profilId === p.id)?.badges?.length ??
                  p.badges.length;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`admin-badges-person${active ? " admin-badges-person--active" : ""}`}
                  onClick={() => setSelectedId(p.id)}
                >
                  <img src={p.imageUrl} alt="" className="admin-badges-person-avatar" />
                  <span className="admin-badges-person-meta">
                    <span className="admin-badges-person-name">
                      {p.name}
                      {p.age != null ? `, ${p.age}` : ""}
                      {p.isSelf ? ` (${t("adminBadgesSelfLabel")})` : ""}
                    </span>
                    <span className="admin-badges-person-count">
                      <Award size={12} aria-hidden />
                      {badgeCount}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>

        {selectedLive ? (
          <div className="admin-badges-selected">
            <h4 className="admin-badges-selected-title">
              {t("adminBadgesEditing")}: {selectedLive.name}
              {selectedLive.age != null ? `, ${selectedLive.age}` : ""}
            </h4>
            <ProfileBadgesSection
              badges={selectedLive.badges}
              suggestions={catalog}
              editable
              manageSuggestions={false}
              onChange={(next) => {
                if (selectedLive.isSelf) onChangeSelfBadges(next);
                else onChangePersonBadges(selectedLive.id, next);
              }}
            />
          </div>
        ) : (
          <p className="admin-badges-pick-hint">{t("adminBadgesPickPerson")}</p>
        )}
      </section>
    </div>
  );
}
