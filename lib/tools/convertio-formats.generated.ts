/**
 * AUTO-GENERATED — do not edit by hand.
 * Source: docs/CONVERTIO-FORMATS-CATALOG.md
 * Regenerate: `node scripts/generate-convertio-formats-ts.mjs`
 * (after updating the catalog via scripts/extract-convertio-formats.mjs)
 *
 * `category` values align with `ConvertToolCategory` in convert-registry.ts (no import here to avoid cycles).
 */

export type ConvertioFormatHubCategory =
  | "documents"
  | "images"
  | "archives"
  | "audio-video"
  | "presentations"
  | "ebooks"
  | "text-data"
  | "vectors-fonts"
  | "other";

export type ConvertioFormatCatalogEntry = {
  id: string;
  label: string;
  slug: string;
  convertioPath: string;
  convertioSection: string;
  category: ConvertioFormatHubCategory;
};

export const CONVERTIO_FORMAT_CATALOG_SOURCE = "https://convertio.co/formats/" as const;

/** Every format row from the scraped Convertio formats index (305+). Not every source→target pair. */
export const CONVERTIO_FORMATS: readonly ConvertioFormatCatalogEntry[] = [
  {
    "id": "archives-7z",
    "label": "7Z",
    "slug": "7z",
    "convertioPath": "/formats/7z/",
    "convertioSection": "Archives",
    "category": "archives"
  },
  {
    "id": "archives-ace",
    "label": "ACE",
    "slug": "ace",
    "convertioPath": "/formats/ace/",
    "convertioSection": "Archives",
    "category": "archives"
  },
  {
    "id": "archives-alz",
    "label": "ALZ",
    "slug": "alz",
    "convertioPath": "/formats/alz/",
    "convertioSection": "Archives",
    "category": "archives"
  },
  {
    "id": "archives-arc",
    "label": "ARC",
    "slug": "arc",
    "convertioPath": "/formats/arc/",
    "convertioSection": "Archives",
    "category": "archives"
  },
  {
    "id": "archives-arj",
    "label": "ARJ",
    "slug": "arj",
    "convertioPath": "/formats/arj/",
    "convertioSection": "Archives",
    "category": "archives"
  },
  {
    "id": "archives-cab",
    "label": "CAB",
    "slug": "cab",
    "convertioPath": "/formats/cab/",
    "convertioSection": "Archives",
    "category": "archives"
  },
  {
    "id": "archives-cpio",
    "label": "CPIO",
    "slug": "cpio",
    "convertioPath": "/formats/cpio/",
    "convertioSection": "Archives",
    "category": "archives"
  },
  {
    "id": "archives-deb",
    "label": "DEB",
    "slug": "deb",
    "convertioPath": "/formats/deb/",
    "convertioSection": "Archives",
    "category": "archives"
  },
  {
    "id": "archives-jar",
    "label": "JAR",
    "slug": "jar",
    "convertioPath": "/formats/jar/",
    "convertioSection": "Archives",
    "category": "archives"
  },
  {
    "id": "archives-lha",
    "label": "LHA",
    "slug": "lha",
    "convertioPath": "/formats/lha/",
    "convertioSection": "Archives",
    "category": "archives"
  },
  {
    "id": "archives-rar",
    "label": "RAR",
    "slug": "rar",
    "convertioPath": "/formats/rar/",
    "convertioSection": "Archives",
    "category": "archives"
  },
  {
    "id": "archives-rpm",
    "label": "RPM",
    "slug": "rpm",
    "convertioPath": "/formats/rpm/",
    "convertioSection": "Archives",
    "category": "archives"
  },
  {
    "id": "archives-tar",
    "label": "TAR",
    "slug": "tar",
    "convertioPath": "/formats/tar/",
    "convertioSection": "Archives",
    "category": "archives"
  },
  {
    "id": "archives-tar.7z",
    "label": "TAR.7Z",
    "slug": "tar.7z",
    "convertioPath": "/formats/tar.7z/",
    "convertioSection": "Archives",
    "category": "archives"
  },
  {
    "id": "archives-tar.bz",
    "label": "TAR.BZ",
    "slug": "tar.bz",
    "convertioPath": "/formats/tar.bz/",
    "convertioSection": "Archives",
    "category": "archives"
  },
  {
    "id": "archives-tar.lz",
    "label": "TAR.LZ",
    "slug": "tar.lz",
    "convertioPath": "/formats/tar.lz/",
    "convertioSection": "Archives",
    "category": "archives"
  },
  {
    "id": "archives-tar.lzma",
    "label": "TAR.LZMA",
    "slug": "tar.lzma",
    "convertioPath": "/formats/tar.lzma/",
    "convertioSection": "Archives",
    "category": "archives"
  },
  {
    "id": "archives-tar.lzo",
    "label": "TAR.LZO",
    "slug": "tar.lzo",
    "convertioPath": "/formats/tar.lzo/",
    "convertioSection": "Archives",
    "category": "archives"
  },
  {
    "id": "archives-tar.xz",
    "label": "TAR.XZ",
    "slug": "tar.xz",
    "convertioPath": "/formats/tar.xz/",
    "convertioSection": "Archives",
    "category": "archives"
  },
  {
    "id": "archives-tar.z",
    "label": "TAR.Z",
    "slug": "tar.z",
    "convertioPath": "/formats/tar.z/",
    "convertioSection": "Archives",
    "category": "archives"
  },
  {
    "id": "archives-tbz2",
    "label": "TBZ2",
    "slug": "tbz2",
    "convertioPath": "/formats/tbz2/",
    "convertioSection": "Archives",
    "category": "archives"
  },
  {
    "id": "archives-tgz",
    "label": "TGZ",
    "slug": "tgz",
    "convertioPath": "/formats/tgz/",
    "convertioSection": "Archives",
    "category": "archives"
  },
  {
    "id": "archives-zip",
    "label": "ZIP",
    "slug": "zip",
    "convertioPath": "/formats/zip/",
    "convertioSection": "Archives",
    "category": "archives"
  },
  {
    "id": "audios-8svx",
    "label": "8SVX",
    "slug": "8svx",
    "convertioPath": "/formats/8svx/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-aac",
    "label": "AAC",
    "slug": "aac",
    "convertioPath": "/formats/aac/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-ac3",
    "label": "AC3",
    "slug": "ac3",
    "convertioPath": "/formats/ac3/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-aiff",
    "label": "AIFF",
    "slug": "aiff",
    "convertioPath": "/formats/aiff/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-amb",
    "label": "AMB",
    "slug": "amb",
    "convertioPath": "/formats/amb/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-amr",
    "label": "AMR",
    "slug": "amr",
    "convertioPath": "/formats/amr/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-ape",
    "label": "APE",
    "slug": "ape",
    "convertioPath": "/formats/ape/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-au",
    "label": "AU",
    "slug": "au",
    "convertioPath": "/formats/au/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-avr",
    "label": "AVR",
    "slug": "avr",
    "convertioPath": "/formats/avr/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-caf",
    "label": "CAF",
    "slug": "caf",
    "convertioPath": "/formats/caf/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-cdda",
    "label": "CDDA",
    "slug": "cdda",
    "convertioPath": "/formats/cdda/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-cvs",
    "label": "CVS",
    "slug": "cvs",
    "convertioPath": "/formats/cvs/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-cvsd",
    "label": "CVSD",
    "slug": "cvsd",
    "convertioPath": "/formats/cvsd/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-cvu",
    "label": "CVU",
    "slug": "cvu",
    "convertioPath": "/formats/cvu/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-dss",
    "label": "DSS",
    "slug": "dss",
    "convertioPath": "/formats/dss/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-dts",
    "label": "DTS",
    "slug": "dts",
    "convertioPath": "/formats/dts/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-dvms",
    "label": "DVMS",
    "slug": "dvms",
    "convertioPath": "/formats/dvms/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-fap",
    "label": "FAP",
    "slug": "fap",
    "convertioPath": "/formats/fap/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-flac",
    "label": "FLAC",
    "slug": "flac",
    "convertioPath": "/formats/flac/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-fssd",
    "label": "FSSD",
    "slug": "fssd",
    "convertioPath": "/formats/fssd/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-gsm",
    "label": "GSM",
    "slug": "gsm",
    "convertioPath": "/formats/gsm/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-gsrt",
    "label": "GSRT",
    "slug": "gsrt",
    "convertioPath": "/formats/gsrt/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-hcom",
    "label": "HCOM",
    "slug": "hcom",
    "convertioPath": "/formats/hcom/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-htk",
    "label": "HTK",
    "slug": "htk",
    "convertioPath": "/formats/htk/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-ima",
    "label": "IMA",
    "slug": "ima",
    "convertioPath": "/formats/ima/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-ircam",
    "label": "IRCAM",
    "slug": "ircam",
    "convertioPath": "/formats/ircam/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-m4a",
    "label": "M4A",
    "slug": "m4a",
    "convertioPath": "/formats/m4a/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-m4r",
    "label": "M4R",
    "slug": "m4r",
    "convertioPath": "/formats/m4r/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-maud",
    "label": "MAUD",
    "slug": "maud",
    "convertioPath": "/formats/maud/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-mp2",
    "label": "MP2",
    "slug": "mp2",
    "convertioPath": "/formats/mp2/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-mp3",
    "label": "MP3",
    "slug": "mp3",
    "convertioPath": "/formats/mp3/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-nist",
    "label": "NIST",
    "slug": "nist",
    "convertioPath": "/formats/nist/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-oga",
    "label": "OGA",
    "slug": "oga",
    "convertioPath": "/formats/oga/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-ogg",
    "label": "OGG",
    "slug": "ogg",
    "convertioPath": "/formats/ogg/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-opus",
    "label": "OPUS",
    "slug": "opus",
    "convertioPath": "/formats/opus/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-paf",
    "label": "PAF",
    "slug": "paf",
    "convertioPath": "/formats/paf/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-prc",
    "label": "PRC",
    "slug": "prc",
    "convertioPath": "/formats/prc/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-pvf",
    "label": "PVF",
    "slug": "pvf",
    "convertioPath": "/formats/pvf/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-ra",
    "label": "RA",
    "slug": "ra",
    "convertioPath": "/formats/ra/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-sd2",
    "label": "SD2",
    "slug": "sd2",
    "convertioPath": "/formats/sd2/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-shn",
    "label": "SHN",
    "slug": "shn",
    "convertioPath": "/formats/shn/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-sln",
    "label": "SLN",
    "slug": "sln",
    "convertioPath": "/formats/sln/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-smp",
    "label": "SMP",
    "slug": "smp",
    "convertioPath": "/formats/smp/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-snd",
    "label": "SND",
    "slug": "snd",
    "convertioPath": "/formats/snd/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-sndr",
    "label": "SNDR",
    "slug": "sndr",
    "convertioPath": "/formats/sndr/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-sndt",
    "label": "SNDT",
    "slug": "sndt",
    "convertioPath": "/formats/sndt/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-sou",
    "label": "SOU",
    "slug": "sou",
    "convertioPath": "/formats/sou/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-sph",
    "label": "SPH",
    "slug": "sph",
    "convertioPath": "/formats/sph/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-spx",
    "label": "SPX",
    "slug": "spx",
    "convertioPath": "/formats/spx/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-tak",
    "label": "TAK",
    "slug": "tak",
    "convertioPath": "/formats/tak/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-tta",
    "label": "TTA",
    "slug": "tta",
    "convertioPath": "/formats/tta/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-txw",
    "label": "TXW",
    "slug": "txw",
    "convertioPath": "/formats/txw/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-vms",
    "label": "VMS",
    "slug": "vms",
    "convertioPath": "/formats/vms/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-voc",
    "label": "VOC",
    "slug": "voc",
    "convertioPath": "/formats/voc/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-vox",
    "label": "VOX",
    "slug": "vox",
    "convertioPath": "/formats/vox/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-vqf",
    "label": "VQF",
    "slug": "vqf",
    "convertioPath": "/formats/vqf/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-w64",
    "label": "W64",
    "slug": "w64",
    "convertioPath": "/formats/w64/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-wav",
    "label": "WAV",
    "slug": "wav",
    "convertioPath": "/formats/wav/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-wma",
    "label": "WMA",
    "slug": "wma",
    "convertioPath": "/formats/wma/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-wv",
    "label": "WV",
    "slug": "wv",
    "convertioPath": "/formats/wv/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-wve",
    "label": "WVE",
    "slug": "wve",
    "convertioPath": "/formats/wve/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "audios-xa",
    "label": "XA",
    "slug": "xa",
    "convertioPath": "/formats/xa/",
    "convertioSection": "Audios",
    "category": "audio-video"
  },
  {
    "id": "cad-dxf",
    "label": "DXF",
    "slug": "dxf",
    "convertioPath": "/formats/dxf/",
    "convertioSection": "CAD",
    "category": "other"
  },
  {
    "id": "documents-abw",
    "label": "ABW",
    "slug": "abw",
    "convertioPath": "/formats/abw/",
    "convertioSection": "Documents",
    "category": "documents"
  },
  {
    "id": "documents-aw",
    "label": "AW",
    "slug": "aw",
    "convertioPath": "/formats/aw/",
    "convertioSection": "Documents",
    "category": "documents"
  },
  {
    "id": "documents-csv",
    "label": "CSV",
    "slug": "csv",
    "convertioPath": "/formats/csv/",
    "convertioSection": "Documents",
    "category": "documents"
  },
  {
    "id": "documents-dbk",
    "label": "DBK",
    "slug": "dbk",
    "convertioPath": "/formats/dbk/",
    "convertioSection": "Documents",
    "category": "documents"
  },
  {
    "id": "documents-djvu",
    "label": "DJVU",
    "slug": "djvu",
    "convertioPath": "/formats/djvu/",
    "convertioSection": "Documents",
    "category": "documents"
  },
  {
    "id": "documents-doc",
    "label": "DOC",
    "slug": "doc",
    "convertioPath": "/formats/doc/",
    "convertioSection": "Documents",
    "category": "documents"
  },
  {
    "id": "documents-docm",
    "label": "DOCM",
    "slug": "docm",
    "convertioPath": "/formats/docm/",
    "convertioSection": "Documents",
    "category": "documents"
  },
  {
    "id": "documents-docx",
    "label": "DOCX",
    "slug": "docx",
    "convertioPath": "/formats/docx/",
    "convertioSection": "Documents",
    "category": "documents"
  },
  {
    "id": "documents-dot",
    "label": "DOT",
    "slug": "dot",
    "convertioPath": "/formats/dot/",
    "convertioSection": "Documents",
    "category": "documents"
  },
  {
    "id": "documents-dotm",
    "label": "DOTM",
    "slug": "dotm",
    "convertioPath": "/formats/dotm/",
    "convertioSection": "Documents",
    "category": "documents"
  },
  {
    "id": "documents-dotx",
    "label": "DOTX",
    "slug": "dotx",
    "convertioPath": "/formats/dotx/",
    "convertioSection": "Documents",
    "category": "documents"
  },
  {
    "id": "documents-html",
    "label": "HTML",
    "slug": "html",
    "convertioPath": "/formats/html/",
    "convertioSection": "Documents",
    "category": "documents"
  },
  {
    "id": "documents-kwd",
    "label": "KWD",
    "slug": "kwd",
    "convertioPath": "/formats/kwd/",
    "convertioSection": "Documents",
    "category": "documents"
  },
  {
    "id": "documents-odt",
    "label": "ODT",
    "slug": "odt",
    "convertioPath": "/formats/odt/",
    "convertioSection": "Documents",
    "category": "documents"
  },
  {
    "id": "documents-oxps",
    "label": "OXPS",
    "slug": "oxps",
    "convertioPath": "/formats/oxps/",
    "convertioSection": "Documents",
    "category": "documents"
  },
  {
    "id": "documents-pdf",
    "label": "PDF",
    "slug": "pdf",
    "convertioPath": "/formats/pdf/",
    "convertioSection": "Documents",
    "category": "documents"
  },
  {
    "id": "documents-rtf",
    "label": "RTF",
    "slug": "rtf",
    "convertioPath": "/formats/rtf/",
    "convertioSection": "Documents",
    "category": "documents"
  },
  {
    "id": "documents-sxw",
    "label": "SXW",
    "slug": "sxw",
    "convertioPath": "/formats/sxw/",
    "convertioSection": "Documents",
    "category": "documents"
  },
  {
    "id": "documents-txt",
    "label": "TXT",
    "slug": "txt",
    "convertioPath": "/formats/txt/",
    "convertioSection": "Documents",
    "category": "documents"
  },
  {
    "id": "documents-wps",
    "label": "WPS",
    "slug": "wps",
    "convertioPath": "/formats/wps/",
    "convertioSection": "Documents",
    "category": "documents"
  },
  {
    "id": "documents-xls",
    "label": "XLS",
    "slug": "xls",
    "convertioPath": "/formats/xls/",
    "convertioSection": "Documents",
    "category": "documents"
  },
  {
    "id": "documents-xlsx",
    "label": "XLSX",
    "slug": "xlsx",
    "convertioPath": "/formats/xlsx/",
    "convertioSection": "Documents",
    "category": "documents"
  },
  {
    "id": "documents-xps",
    "label": "XPS",
    "slug": "xps",
    "convertioPath": "/formats/xps/",
    "convertioSection": "Documents",
    "category": "documents"
  },
  {
    "id": "ebooks-azw3",
    "label": "AZW3",
    "slug": "azw3",
    "convertioPath": "/formats/azw3/",
    "convertioSection": "EBooks",
    "category": "ebooks"
  },
  {
    "id": "ebooks-epub",
    "label": "EPUB",
    "slug": "epub",
    "convertioPath": "/formats/epub/",
    "convertioSection": "EBooks",
    "category": "ebooks"
  },
  {
    "id": "ebooks-fb2",
    "label": "FB2",
    "slug": "fb2",
    "convertioPath": "/formats/fb2/",
    "convertioSection": "EBooks",
    "category": "ebooks"
  },
  {
    "id": "ebooks-lrf",
    "label": "LRF",
    "slug": "lrf",
    "convertioPath": "/formats/lrf/",
    "convertioSection": "EBooks",
    "category": "ebooks"
  },
  {
    "id": "ebooks-mobi",
    "label": "MOBI",
    "slug": "mobi",
    "convertioPath": "/formats/mobi/",
    "convertioSection": "EBooks",
    "category": "ebooks"
  },
  {
    "id": "ebooks-pdb",
    "label": "PDB",
    "slug": "pdb",
    "convertioPath": "/formats/pdb/",
    "convertioSection": "EBooks",
    "category": "ebooks"
  },
  {
    "id": "ebooks-rb",
    "label": "RB",
    "slug": "rb",
    "convertioPath": "/formats/rb/",
    "convertioSection": "EBooks",
    "category": "ebooks"
  },
  {
    "id": "ebooks-snb",
    "label": "SNB",
    "slug": "snb",
    "convertioPath": "/formats/snb/",
    "convertioSection": "EBooks",
    "category": "ebooks"
  },
  {
    "id": "ebooks-tcr",
    "label": "TCR",
    "slug": "tcr",
    "convertioPath": "/formats/tcr/",
    "convertioSection": "EBooks",
    "category": "ebooks"
  },
  {
    "id": "fonts-afm",
    "label": "AFM",
    "slug": "afm",
    "convertioPath": "/formats/afm/",
    "convertioSection": "Fonts",
    "category": "vectors-fonts"
  },
  {
    "id": "fonts-bin",
    "label": "BIN",
    "slug": "bin",
    "convertioPath": "/formats/bin/",
    "convertioSection": "Fonts",
    "category": "vectors-fonts"
  },
  {
    "id": "fonts-cff",
    "label": "CFF",
    "slug": "cff",
    "convertioPath": "/formats/cff/",
    "convertioSection": "Fonts",
    "category": "vectors-fonts"
  },
  {
    "id": "fonts-cid",
    "label": "CID",
    "slug": "cid",
    "convertioPath": "/formats/cid/",
    "convertioSection": "Fonts",
    "category": "vectors-fonts"
  },
  {
    "id": "fonts-dfont",
    "label": "DFONT",
    "slug": "dfont",
    "convertioPath": "/formats/dfont/",
    "convertioSection": "Fonts",
    "category": "vectors-fonts"
  },
  {
    "id": "fonts-otf",
    "label": "OTF",
    "slug": "otf",
    "convertioPath": "/formats/otf/",
    "convertioSection": "Fonts",
    "category": "vectors-fonts"
  },
  {
    "id": "fonts-pfa",
    "label": "PFA",
    "slug": "pfa",
    "convertioPath": "/formats/pfa/",
    "convertioSection": "Fonts",
    "category": "vectors-fonts"
  },
  {
    "id": "fonts-pfb",
    "label": "PFB",
    "slug": "pfb",
    "convertioPath": "/formats/pfb/",
    "convertioSection": "Fonts",
    "category": "vectors-fonts"
  },
  {
    "id": "fonts-ps",
    "label": "PS",
    "slug": "ps",
    "convertioPath": "/formats/ps/",
    "convertioSection": "Fonts",
    "category": "vectors-fonts"
  },
  {
    "id": "fonts-pt3",
    "label": "PT3",
    "slug": "pt3",
    "convertioPath": "/formats/pt3/",
    "convertioSection": "Fonts",
    "category": "vectors-fonts"
  },
  {
    "id": "fonts-sfd",
    "label": "SFD",
    "slug": "sfd",
    "convertioPath": "/formats/sfd/",
    "convertioSection": "Fonts",
    "category": "vectors-fonts"
  },
  {
    "id": "fonts-t11",
    "label": "T11",
    "slug": "t11",
    "convertioPath": "/formats/t11/",
    "convertioSection": "Fonts",
    "category": "vectors-fonts"
  },
  {
    "id": "fonts-t42",
    "label": "T42",
    "slug": "t42",
    "convertioPath": "/formats/t42/",
    "convertioSection": "Fonts",
    "category": "vectors-fonts"
  },
  {
    "id": "fonts-ttf",
    "label": "TTF",
    "slug": "ttf",
    "convertioPath": "/formats/ttf/",
    "convertioSection": "Fonts",
    "category": "vectors-fonts"
  },
  {
    "id": "fonts-ufo",
    "label": "UFO",
    "slug": "ufo",
    "convertioPath": "/formats/ufo/",
    "convertioSection": "Fonts",
    "category": "vectors-fonts"
  },
  {
    "id": "fonts-woff",
    "label": "WOFF",
    "slug": "woff",
    "convertioPath": "/formats/woff/",
    "convertioSection": "Fonts",
    "category": "vectors-fonts"
  },
  {
    "id": "images-3fr",
    "label": "3FR",
    "slug": "3fr",
    "convertioPath": "/formats/3fr/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-arw",
    "label": "ARW",
    "slug": "arw",
    "convertioPath": "/formats/arw/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-avif",
    "label": "AVIF",
    "slug": "avif",
    "convertioPath": "/formats/avif/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-bmp",
    "label": "BMP",
    "slug": "bmp",
    "convertioPath": "/formats/bmp/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-cr2",
    "label": "CR2",
    "slug": "cr2",
    "convertioPath": "/formats/cr2/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-crw",
    "label": "CRW",
    "slug": "crw",
    "convertioPath": "/formats/crw/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-cur",
    "label": "CUR",
    "slug": "cur",
    "convertioPath": "/formats/cur/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-dcm",
    "label": "DCM",
    "slug": "dcm",
    "convertioPath": "/formats/dcm/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-dcr",
    "label": "DCR",
    "slug": "dcr",
    "convertioPath": "/formats/dcr/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-dds",
    "label": "DDS",
    "slug": "dds",
    "convertioPath": "/formats/dds/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-dng",
    "label": "DNG",
    "slug": "dng",
    "convertioPath": "/formats/dng/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-erf",
    "label": "ERF",
    "slug": "erf",
    "convertioPath": "/formats/erf/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-exr",
    "label": "EXR",
    "slug": "exr",
    "convertioPath": "/formats/exr/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-fax",
    "label": "FAX",
    "slug": "fax",
    "convertioPath": "/formats/fax/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-fts",
    "label": "FTS",
    "slug": "fts",
    "convertioPath": "/formats/fts/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-g3",
    "label": "G3",
    "slug": "g3",
    "convertioPath": "/formats/g3/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-g4",
    "label": "G4",
    "slug": "g4",
    "convertioPath": "/formats/g4/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-gif",
    "label": "GIF",
    "slug": "gif",
    "convertioPath": "/formats/gif/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-gv",
    "label": "GV",
    "slug": "gv",
    "convertioPath": "/formats/gv/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-hdr",
    "label": "HDR",
    "slug": "hdr",
    "convertioPath": "/formats/hdr/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-heic",
    "label": "HEIC",
    "slug": "heic",
    "convertioPath": "/formats/heic/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-heif",
    "label": "HEIF",
    "slug": "heif",
    "convertioPath": "/formats/heif/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-hrz",
    "label": "HRZ",
    "slug": "hrz",
    "convertioPath": "/formats/hrz/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-ico",
    "label": "ICO",
    "slug": "ico",
    "convertioPath": "/formats/ico/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-iiq",
    "label": "IIQ",
    "slug": "iiq",
    "convertioPath": "/formats/iiq/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-ipl",
    "label": "IPL",
    "slug": "ipl",
    "convertioPath": "/formats/ipl/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-jbg",
    "label": "JBG",
    "slug": "jbg",
    "convertioPath": "/formats/jbg/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-jbig",
    "label": "JBIG",
    "slug": "jbig",
    "convertioPath": "/formats/jbig/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-jfi",
    "label": "JFI",
    "slug": "jfi",
    "convertioPath": "/formats/jfi/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-jfif",
    "label": "JFIF",
    "slug": "jfif",
    "convertioPath": "/formats/jfif/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-jif",
    "label": "JIF",
    "slug": "jif",
    "convertioPath": "/formats/jif/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-jnx",
    "label": "JNX",
    "slug": "jnx",
    "convertioPath": "/formats/jnx/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-jp2",
    "label": "JP2",
    "slug": "jp2",
    "convertioPath": "/formats/jp2/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-jpe",
    "label": "JPE",
    "slug": "jpe",
    "convertioPath": "/formats/jpe/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-jpeg",
    "label": "JPEG",
    "slug": "jpeg",
    "convertioPath": "/formats/jpeg/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-jpg",
    "label": "JPG",
    "slug": "jpg",
    "convertioPath": "/formats/jpg/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-jps",
    "label": "JPS",
    "slug": "jps",
    "convertioPath": "/formats/jps/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-k25",
    "label": "K25",
    "slug": "k25",
    "convertioPath": "/formats/k25/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-kdc",
    "label": "KDC",
    "slug": "kdc",
    "convertioPath": "/formats/kdc/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-mac",
    "label": "MAC",
    "slug": "mac",
    "convertioPath": "/formats/mac/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-map",
    "label": "MAP",
    "slug": "map",
    "convertioPath": "/formats/map/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-mef",
    "label": "MEF",
    "slug": "mef",
    "convertioPath": "/formats/mef/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-mng",
    "label": "MNG",
    "slug": "mng",
    "convertioPath": "/formats/mng/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-mrw",
    "label": "MRW",
    "slug": "mrw",
    "convertioPath": "/formats/mrw/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-mtv",
    "label": "MTV",
    "slug": "mtv",
    "convertioPath": "/formats/mtv/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-nef",
    "label": "NEF",
    "slug": "nef",
    "convertioPath": "/formats/nef/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-nrw",
    "label": "NRW",
    "slug": "nrw",
    "convertioPath": "/formats/nrw/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-orf",
    "label": "ORF",
    "slug": "orf",
    "convertioPath": "/formats/orf/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-otb",
    "label": "OTB",
    "slug": "otb",
    "convertioPath": "/formats/otb/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-pal",
    "label": "PAL",
    "slug": "pal",
    "convertioPath": "/formats/pal/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-palm",
    "label": "PALM",
    "slug": "palm",
    "convertioPath": "/formats/palm/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-pam",
    "label": "PAM",
    "slug": "pam",
    "convertioPath": "/formats/pam/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-pbm",
    "label": "PBM",
    "slug": "pbm",
    "convertioPath": "/formats/pbm/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-pcd",
    "label": "PCD",
    "slug": "pcd",
    "convertioPath": "/formats/pcd/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-pct",
    "label": "PCT",
    "slug": "pct",
    "convertioPath": "/formats/pct/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-pcx",
    "label": "PCX",
    "slug": "pcx",
    "convertioPath": "/formats/pcx/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-pdb",
    "label": "PDB",
    "slug": "pdb",
    "convertioPath": "/formats/pdb/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-pef",
    "label": "PEF",
    "slug": "pef",
    "convertioPath": "/formats/pef/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-pes",
    "label": "PES",
    "slug": "pes",
    "convertioPath": "/formats/pes/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-pfm",
    "label": "PFM",
    "slug": "pfm",
    "convertioPath": "/formats/pfm/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-pgm",
    "label": "PGM",
    "slug": "pgm",
    "convertioPath": "/formats/pgm/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-pgx",
    "label": "PGX",
    "slug": "pgx",
    "convertioPath": "/formats/pgx/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-picon",
    "label": "PICON",
    "slug": "picon",
    "convertioPath": "/formats/picon/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-pict",
    "label": "PICT",
    "slug": "pict",
    "convertioPath": "/formats/pict/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-pix",
    "label": "PIX",
    "slug": "pix",
    "convertioPath": "/formats/pix/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-plasma",
    "label": "PLASMA",
    "slug": "plasma",
    "convertioPath": "/formats/plasma/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-png",
    "label": "PNG",
    "slug": "png",
    "convertioPath": "/formats/png/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-pnm",
    "label": "PNM",
    "slug": "pnm",
    "convertioPath": "/formats/pnm/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-ppm",
    "label": "PPM",
    "slug": "ppm",
    "convertioPath": "/formats/ppm/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-psd",
    "label": "PSD",
    "slug": "psd",
    "convertioPath": "/formats/psd/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-pwp",
    "label": "PWP",
    "slug": "pwp",
    "convertioPath": "/formats/pwp/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-raf",
    "label": "RAF",
    "slug": "raf",
    "convertioPath": "/formats/raf/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-ras",
    "label": "RAS",
    "slug": "ras",
    "convertioPath": "/formats/ras/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-rgb",
    "label": "RGB",
    "slug": "rgb",
    "convertioPath": "/formats/rgb/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-rgba",
    "label": "RGBA",
    "slug": "rgba",
    "convertioPath": "/formats/rgba/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-rgbo",
    "label": "RGBO",
    "slug": "rgbo",
    "convertioPath": "/formats/rgbo/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-rgf",
    "label": "RGF",
    "slug": "rgf",
    "convertioPath": "/formats/rgf/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-rla",
    "label": "RLA",
    "slug": "rla",
    "convertioPath": "/formats/rla/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-rle",
    "label": "RLE",
    "slug": "rle",
    "convertioPath": "/formats/rle/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-rw2",
    "label": "RW2",
    "slug": "rw2",
    "convertioPath": "/formats/rw2/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-sct",
    "label": "SCT",
    "slug": "sct",
    "convertioPath": "/formats/sct/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-sfw",
    "label": "SFW",
    "slug": "sfw",
    "convertioPath": "/formats/sfw/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-sgi",
    "label": "SGI",
    "slug": "sgi",
    "convertioPath": "/formats/sgi/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-six",
    "label": "SIX",
    "slug": "six",
    "convertioPath": "/formats/six/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-sixel",
    "label": "SIXEL",
    "slug": "sixel",
    "convertioPath": "/formats/sixel/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-sr2",
    "label": "SR2",
    "slug": "sr2",
    "convertioPath": "/formats/sr2/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-srf",
    "label": "SRF",
    "slug": "srf",
    "convertioPath": "/formats/srf/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-sun",
    "label": "SUN",
    "slug": "sun",
    "convertioPath": "/formats/sun/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-svg",
    "label": "SVG",
    "slug": "svg",
    "convertioPath": "/formats/svg/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-tga",
    "label": "TGA",
    "slug": "tga",
    "convertioPath": "/formats/tga/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-tiff",
    "label": "TIFF",
    "slug": "tiff",
    "convertioPath": "/formats/tiff/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-tim",
    "label": "TIM",
    "slug": "tim",
    "convertioPath": "/formats/tim/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-tm2",
    "label": "TM2",
    "slug": "tm2",
    "convertioPath": "/formats/tm2/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-uyvy",
    "label": "UYVY",
    "slug": "uyvy",
    "convertioPath": "/formats/uyvy/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-viff",
    "label": "VIFF",
    "slug": "viff",
    "convertioPath": "/formats/viff/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-vips",
    "label": "VIPS",
    "slug": "vips",
    "convertioPath": "/formats/vips/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-wbmp",
    "label": "WBMP",
    "slug": "wbmp",
    "convertioPath": "/formats/wbmp/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-webp",
    "label": "WEBP",
    "slug": "webp",
    "convertioPath": "/formats/webp/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-wmz",
    "label": "WMZ",
    "slug": "wmz",
    "convertioPath": "/formats/wmz/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-wpg",
    "label": "WPG",
    "slug": "wpg",
    "convertioPath": "/formats/wpg/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-x3f",
    "label": "X3F",
    "slug": "x3f",
    "convertioPath": "/formats/x3f/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-xbm",
    "label": "XBM",
    "slug": "xbm",
    "convertioPath": "/formats/xbm/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-xc",
    "label": "XC",
    "slug": "xc",
    "convertioPath": "/formats/xc/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-xcf",
    "label": "XCF",
    "slug": "xcf",
    "convertioPath": "/formats/xcf/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-xpm",
    "label": "XPM",
    "slug": "xpm",
    "convertioPath": "/formats/xpm/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-xv",
    "label": "XV",
    "slug": "xv",
    "convertioPath": "/formats/xv/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-xwd",
    "label": "XWD",
    "slug": "xwd",
    "convertioPath": "/formats/xwd/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "images-yuv",
    "label": "YUV",
    "slug": "yuv",
    "convertioPath": "/formats/yuv/",
    "convertioSection": "Images",
    "category": "images"
  },
  {
    "id": "presentations-odp",
    "label": "ODP",
    "slug": "odp",
    "convertioPath": "/formats/odp/",
    "convertioSection": "Presentations",
    "category": "presentations"
  },
  {
    "id": "presentations-pot",
    "label": "POT",
    "slug": "pot",
    "convertioPath": "/formats/pot/",
    "convertioSection": "Presentations",
    "category": "presentations"
  },
  {
    "id": "presentations-potm",
    "label": "POTM",
    "slug": "potm",
    "convertioPath": "/formats/potm/",
    "convertioSection": "Presentations",
    "category": "presentations"
  },
  {
    "id": "presentations-potx",
    "label": "POTX",
    "slug": "potx",
    "convertioPath": "/formats/potx/",
    "convertioSection": "Presentations",
    "category": "presentations"
  },
  {
    "id": "presentations-pps",
    "label": "PPS",
    "slug": "pps",
    "convertioPath": "/formats/pps/",
    "convertioSection": "Presentations",
    "category": "presentations"
  },
  {
    "id": "presentations-ppsm",
    "label": "PPSM",
    "slug": "ppsm",
    "convertioPath": "/formats/ppsm/",
    "convertioSection": "Presentations",
    "category": "presentations"
  },
  {
    "id": "presentations-ppsx",
    "label": "PPSX",
    "slug": "ppsx",
    "convertioPath": "/formats/ppsx/",
    "convertioSection": "Presentations",
    "category": "presentations"
  },
  {
    "id": "presentations-ppt",
    "label": "PPT",
    "slug": "ppt",
    "convertioPath": "/formats/ppt/",
    "convertioSection": "Presentations",
    "category": "presentations"
  },
  {
    "id": "presentations-pptm",
    "label": "PPTM",
    "slug": "pptm",
    "convertioPath": "/formats/pptm/",
    "convertioSection": "Presentations",
    "category": "presentations"
  },
  {
    "id": "presentations-pptx",
    "label": "PPTX",
    "slug": "pptx",
    "convertioPath": "/formats/pptx/",
    "convertioSection": "Presentations",
    "category": "presentations"
  },
  {
    "id": "vectors-aff",
    "label": "AFF",
    "slug": "aff",
    "convertioPath": "/formats/aff/",
    "convertioSection": "Vectors",
    "category": "vectors-fonts"
  },
  {
    "id": "vectors-ai",
    "label": "AI",
    "slug": "ai",
    "convertioPath": "/formats/ai/",
    "convertioSection": "Vectors",
    "category": "vectors-fonts"
  },
  {
    "id": "vectors-ccx",
    "label": "CCX",
    "slug": "ccx",
    "convertioPath": "/formats/ccx/",
    "convertioSection": "Vectors",
    "category": "vectors-fonts"
  },
  {
    "id": "vectors-cdr",
    "label": "CDR",
    "slug": "cdr",
    "convertioPath": "/formats/cdr/",
    "convertioSection": "Vectors",
    "category": "vectors-fonts"
  },
  {
    "id": "vectors-cdt",
    "label": "CDT",
    "slug": "cdt",
    "convertioPath": "/formats/cdt/",
    "convertioSection": "Vectors",
    "category": "vectors-fonts"
  },
  {
    "id": "vectors-cgm",
    "label": "CGM",
    "slug": "cgm",
    "convertioPath": "/formats/cgm/",
    "convertioSection": "Vectors",
    "category": "vectors-fonts"
  },
  {
    "id": "vectors-cmx",
    "label": "CMX",
    "slug": "cmx",
    "convertioPath": "/formats/cmx/",
    "convertioSection": "Vectors",
    "category": "vectors-fonts"
  },
  {
    "id": "vectors-dst",
    "label": "DST",
    "slug": "dst",
    "convertioPath": "/formats/dst/",
    "convertioSection": "Vectors",
    "category": "vectors-fonts"
  },
  {
    "id": "vectors-emf",
    "label": "EMF",
    "slug": "emf",
    "convertioPath": "/formats/emf/",
    "convertioSection": "Vectors",
    "category": "vectors-fonts"
  },
  {
    "id": "vectors-eps",
    "label": "EPS",
    "slug": "eps",
    "convertioPath": "/formats/eps/",
    "convertioSection": "Vectors",
    "category": "vectors-fonts"
  },
  {
    "id": "vectors-exp",
    "label": "EXP",
    "slug": "exp",
    "convertioPath": "/formats/exp/",
    "convertioSection": "Vectors",
    "category": "vectors-fonts"
  },
  {
    "id": "vectors-fig",
    "label": "FIG",
    "slug": "fig",
    "convertioPath": "/formats/fig/",
    "convertioSection": "Vectors",
    "category": "vectors-fonts"
  },
  {
    "id": "vectors-pcs",
    "label": "PCS",
    "slug": "pcs",
    "convertioPath": "/formats/pcs/",
    "convertioSection": "Vectors",
    "category": "vectors-fonts"
  },
  {
    "id": "vectors-pes",
    "label": "PES",
    "slug": "pes",
    "convertioPath": "/formats/pes/",
    "convertioSection": "Vectors",
    "category": "vectors-fonts"
  },
  {
    "id": "vectors-plt",
    "label": "PLT",
    "slug": "plt",
    "convertioPath": "/formats/plt/",
    "convertioSection": "Vectors",
    "category": "vectors-fonts"
  },
  {
    "id": "vectors-ps",
    "label": "PS",
    "slug": "ps",
    "convertioPath": "/formats/ps/",
    "convertioSection": "Vectors",
    "category": "vectors-fonts"
  },
  {
    "id": "vectors-sk",
    "label": "SK",
    "slug": "sk",
    "convertioPath": "/formats/sk/",
    "convertioSection": "Vectors",
    "category": "vectors-fonts"
  },
  {
    "id": "vectors-sk1",
    "label": "SK1",
    "slug": "sk1",
    "convertioPath": "/formats/sk1/",
    "convertioSection": "Vectors",
    "category": "vectors-fonts"
  },
  {
    "id": "vectors-svg",
    "label": "SVG",
    "slug": "svg",
    "convertioPath": "/formats/svg/",
    "convertioSection": "Vectors",
    "category": "vectors-fonts"
  },
  {
    "id": "vectors-wmf",
    "label": "WMF",
    "slug": "wmf",
    "convertioPath": "/formats/wmf/",
    "convertioSection": "Vectors",
    "category": "vectors-fonts"
  },
  {
    "id": "videos-3g2",
    "label": "3G2",
    "slug": "3g2",
    "convertioPath": "/formats/3g2/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-3gp",
    "label": "3GP",
    "slug": "3gp",
    "convertioPath": "/formats/3gp/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-aaf",
    "label": "AAF",
    "slug": "aaf",
    "convertioPath": "/formats/aaf/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-asf",
    "label": "ASF",
    "slug": "asf",
    "convertioPath": "/formats/asf/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-av1",
    "label": "AV1",
    "slug": "av1",
    "convertioPath": "/formats/av1/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-avchd",
    "label": "AVCHD",
    "slug": "avchd",
    "convertioPath": "/formats/avchd/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-avi",
    "label": "AVI",
    "slug": "avi",
    "convertioPath": "/formats/avi/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-cavs",
    "label": "CAVS",
    "slug": "cavs",
    "convertioPath": "/formats/cavs/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-divx",
    "label": "DIVX",
    "slug": "divx",
    "convertioPath": "/formats/divx/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-dv",
    "label": "DV",
    "slug": "dv",
    "convertioPath": "/formats/dv/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-f4v",
    "label": "F4V",
    "slug": "f4v",
    "convertioPath": "/formats/f4v/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-flv",
    "label": "FLV",
    "slug": "flv",
    "convertioPath": "/formats/flv/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-hevc",
    "label": "HEVC",
    "slug": "hevc",
    "convertioPath": "/formats/hevc/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-m2ts",
    "label": "M2TS",
    "slug": "m2ts",
    "convertioPath": "/formats/m2ts/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-m2v",
    "label": "M2V",
    "slug": "m2v",
    "convertioPath": "/formats/m2v/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-m4v",
    "label": "M4V",
    "slug": "m4v",
    "convertioPath": "/formats/m4v/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-mjpeg",
    "label": "MJPEG",
    "slug": "mjpeg",
    "convertioPath": "/formats/mjpeg/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-mkv",
    "label": "MKV",
    "slug": "mkv",
    "convertioPath": "/formats/mkv/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-mod",
    "label": "MOD",
    "slug": "mod",
    "convertioPath": "/formats/mod/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-mov",
    "label": "MOV",
    "slug": "mov",
    "convertioPath": "/formats/mov/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-mp4",
    "label": "MP4",
    "slug": "mp4",
    "convertioPath": "/formats/mp4/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-mpeg",
    "label": "MPEG",
    "slug": "mpeg",
    "convertioPath": "/formats/mpeg/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-mpeg2",
    "label": "MPEG-2",
    "slug": "mpeg2",
    "convertioPath": "/formats/mpeg2/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-mpg",
    "label": "MPG",
    "slug": "mpg",
    "convertioPath": "/formats/mpg/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-mts",
    "label": "MTS",
    "slug": "mts",
    "convertioPath": "/formats/mts/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-mxf",
    "label": "MXF",
    "slug": "mxf",
    "convertioPath": "/formats/mxf/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-ogv",
    "label": "OGV",
    "slug": "ogv",
    "convertioPath": "/formats/ogv/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-rm",
    "label": "RM",
    "slug": "rm",
    "convertioPath": "/formats/rm/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-rmvb",
    "label": "RMVB",
    "slug": "rmvb",
    "convertioPath": "/formats/rmvb/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-swf",
    "label": "SWF",
    "slug": "swf",
    "convertioPath": "/formats/swf/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-tod",
    "label": "TOD",
    "slug": "tod",
    "convertioPath": "/formats/tod/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-ts",
    "label": "TS",
    "slug": "ts",
    "convertioPath": "/formats/ts/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-vob",
    "label": "VOB",
    "slug": "vob",
    "convertioPath": "/formats/vob/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-webm",
    "label": "WEBM",
    "slug": "webm",
    "convertioPath": "/formats/webm/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-wmv",
    "label": "WMV",
    "slug": "wmv",
    "convertioPath": "/formats/wmv/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-wtv",
    "label": "WTV",
    "slug": "wtv",
    "convertioPath": "/formats/wtv/",
    "convertioSection": "Videos",
    "category": "audio-video"
  },
  {
    "id": "videos-xvid",
    "label": "XVID",
    "slug": "xvid",
    "convertioPath": "/formats/xvid/",
    "convertioSection": "Videos",
    "category": "audio-video"
  }
];

export const CONVERTIO_FORMAT_COUNT = CONVERTIO_FORMATS.length;
