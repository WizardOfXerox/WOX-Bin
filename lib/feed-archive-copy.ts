import type { UiLanguage } from "@/lib/i18n";

type FeedArchiveCopy = {
  feed: {
    eyebrow: string;
    title: string;
    description: string;
    archiveLeadIn: string;
    byLabel: string;
    dateConnector: string;
    anonymous: string;
    views: string;
    stars: string;
    comments: string;
  };
  archive: {
    eyebrow: string;
    title: string;
    description: string;
    empty: string;
    posted: string;
    syntax: string;
    views: string;
    untitled: string;
    nameTitle: string;
    showing: string;
    cardFeed: string;
  };
};

export const FEED_ARCHIVE_COPY: Record<UiLanguage, FeedArchiveCopy> = {
  en: {
    feed: {
      eyebrow: "WOX-Bin feed",
      title: "Fresh public pastes",
      description:
        "Public entries from the new WOX-Bin workspace. This feed shows the {limit} most recently updated public pastes. Password-protected, hidden, expired, and deleted content stays out of this feed.",
      archiveLeadIn: "Prefer a compact table? See the",
      byLabel: "By",
      dateConnector: "on",
      anonymous: "Anonymous",
      views: "views",
      stars: "stars",
      comments: "comments"
    },
    archive: {
      eyebrow: "Public archive",
      title: "Pastes archive",
      description:
        "This page lists the most recently updated public pastes, similar to a classic paste archive. It now shows the {limit} most recent public pastes. Password-protected, hidden, expired, and deleted pastes are excluded.",
      empty: "No public pastes yet. When users publish public pastes, they will appear here.",
      posted: "Posted",
      syntax: "Syntax",
      views: "Views",
      untitled: "Untitled",
      nameTitle: "Name / title",
      showing: "Showing {count} recent public paste{suffix}. For previews and snippets, try the card feed.",
      cardFeed: "card feed"
    }
  },
  fil: {
    feed: {
      eyebrow: "WOX-Bin feed",
      title: "Mga bagong public paste",
      description:
        "Mga public entry mula sa bagong WOX-Bin workspace. Ipinapakita ng feed na ito ang {limit} pinakahuling na-update na public pastes. Hindi kasama rito ang may password, hidden, expired, at deleted na content.",
      archiveLeadIn: "Kung gusto mo ng mas compact na table, tingnan ang",
      byLabel: "Ni",
      dateConnector: "noong",
      anonymous: "Anonymous",
      views: "views",
      stars: "stars",
      comments: "comments"
    },
    archive: {
      eyebrow: "Public archive",
      title: "Archive ng mga paste",
      description:
        "Ipinapakita ng page na ito ang pinakahuling na-update na public pastes, katulad ng classic paste archive. Makikita rito ang {limit} pinakabagong public pastes. Hindi kasama ang password-protected, hidden, expired, at deleted pastes.",
      empty: "Wala pang public pastes. Kapag may nag-publish ng public paste, lalabas iyon dito.",
      posted: "Na-post",
      syntax: "Syntax",
      views: "Views",
      untitled: "Walang pamagat",
      nameTitle: "Pangalan / pamagat",
      showing: "Ipinapakita ang {count} kamakailang public paste{suffix}. Para sa previews at snippets, subukan ang card feed.",
      cardFeed: "card feed"
    }
  },
  ja: {
    feed: {
      eyebrow: "WOX-Bin フィード",
      title: "最新の公開ペースト",
      description:
        "新しい WOX-Bin ワークスペースからの公開エントリです。このフィードには、最近更新された公開ペースト {limit} 件が表示されます。パスワード付き、非表示、期限切れ、削除済みの内容は含まれません。",
      archiveLeadIn: "コンパクトな表がよければ",
      byLabel: "投稿者",
      dateConnector: "更新日",
      anonymous: "匿名",
      views: "閲覧",
      stars: "スター",
      comments: "コメント"
    },
    archive: {
      eyebrow: "公開アーカイブ",
      title: "ペーストアーカイブ",
      description:
        "このページには、クラシックなペーストアーカイブのように、最近更新された公開ペーストが並びます。現在は最新の公開ペースト {limit} 件を表示します。パスワード付き、非表示、期限切れ、削除済みのペーストは除外されます。",
      empty: "まだ公開ペーストはありません。ユーザーが公開ペーストを作成すると、ここに表示されます。",
      posted: "投稿日",
      syntax: "構文",
      views: "閲覧数",
      untitled: "無題",
      nameTitle: "名前 / タイトル",
      showing: "最近の公開ペースト {count} 件{suffix}を表示中。プレビューや断片を見るならカードフィードをお試しください。",
      cardFeed: "カードフィード"
    }
  },
  es: {
    feed: {
      eyebrow: "Feed de WOX-Bin",
      title: "Pastes públicos recientes",
      description:
        "Entradas públicas del nuevo workspace de WOX-Bin. Este feed muestra los {limit} pastes públicos actualizados más recientemente. El contenido con contraseña, oculto, expirado o eliminado queda fuera de este feed.",
      archiveLeadIn: "¿Prefieres una tabla compacta? Mira el",
      byLabel: "Por",
      dateConnector: "el",
      anonymous: "Anónimo",
      views: "vistas",
      stars: "estrellas",
      comments: "comentarios"
    },
    archive: {
      eyebrow: "Archivo público",
      title: "Archivo de pastes",
      description:
        "Esta página lista los pastes públicos actualizados más recientemente, similar a un archivo clásico de pastes. Ahora muestra los {limit} pastes públicos más recientes. Los pastes protegidos por contraseña, ocultos, expirados o eliminados quedan excluidos.",
      empty: "Todavía no hay pastes públicos. Cuando los usuarios publiquen pastes públicos, aparecerán aquí.",
      posted: "Publicado",
      syntax: "Sintaxis",
      views: "Vistas",
      untitled: "Sin título",
      nameTitle: "Nombre / título",
      showing: "Mostrando {count} paste{suffix} público{sPlural} reciente{sPlural}. Para vistas previas y snippets, prueba el feed en tarjetas.",
      cardFeed: "feed en tarjetas"
    }
  }
};
