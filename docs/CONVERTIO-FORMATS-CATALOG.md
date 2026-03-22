# Convertio format catalog (scraped snapshot)

Source: [convertio.co/formats](https://convertio.co/formats/) — Convertio advertises **300+ file formats** and **25,600+ conversion combinations**; this document lists **format entries** from their public formats index (not every possible source→target pair).

**Notes**

- Each format page indicates **Read** / **Write** where applicable; not all conversions exist both ways.
- **OCR**, **API-only**, or regional limits may apply; verify on their site or [API docs](https://developers.convertio.co/api/docs/).
- Regenerate: `firecrawl scrape "https://convertio.co/formats/" -o .firecrawl-convertio-formats.md` then `node scripts/extract-convertio-formats.mjs`.

**Counts (this scrape):** 10 categories, **305** unique format labels; **309** index rows when the same extension appears under more than one Convertio section (e.g. PDB in e-books vs images). Regenerate TS: `npm run gen:convertio-formats`.

**All conversion URLs (~25,600+):** run `npm run fetch:convertio-pairs` to crawl each format page and write `public/data/convertio-pairs.json` (unique tool links such as `pdf-docx/`, `convert-pdf-to-doc/`). The converter hub loads this file in the “Every Convertio conversion route” panel.

---

## Archives

- **7Z** — `/formats/7z/`
- **ACE** — `/formats/ace/`
- **ALZ** — `/formats/alz/`
- **ARC** — `/formats/arc/`
- **ARJ** — `/formats/arj/`
- **CAB** — `/formats/cab/`
- **CPIO** — `/formats/cpio/`
- **DEB** — `/formats/deb/`
- **JAR** — `/formats/jar/`
- **LHA** — `/formats/lha/`
- **RAR** — `/formats/rar/`
- **RPM** — `/formats/rpm/`
- **TAR** — `/formats/tar/`
- **TAR.7Z** — `/formats/tar.7z/`
- **TAR.BZ** — `/formats/tar.bz/`
- **TAR.LZ** — `/formats/tar.lz/`
- **TAR.LZMA** — `/formats/tar.lzma/`
- **TAR.LZO** — `/formats/tar.lzo/`
- **TAR.XZ** — `/formats/tar.xz/`
- **TAR.Z** — `/formats/tar.z/`
- **TBZ2** — `/formats/tbz2/`
- **TGZ** — `/formats/tgz/`
- **ZIP** — `/formats/zip/`

## Audios

- **8SVX** — `/formats/8svx/`
- **AAC** — `/formats/aac/`
- **AC3** — `/formats/ac3/`
- **AIFF** — `/formats/aiff/`
- **AMB** — `/formats/amb/`
- **AMR** — `/formats/amr/`
- **APE** — `/formats/ape/`
- **AU** — `/formats/au/`
- **AVR** — `/formats/avr/`
- **CAF** — `/formats/caf/`
- **CDDA** — `/formats/cdda/`
- **CVS** — `/formats/cvs/`
- **CVSD** — `/formats/cvsd/`
- **CVU** — `/formats/cvu/`
- **DSS** — `/formats/dss/`
- **DTS** — `/formats/dts/`
- **DVMS** — `/formats/dvms/`
- **FAP** — `/formats/fap/`
- **FLAC** — `/formats/flac/`
- **FSSD** — `/formats/fssd/`
- **GSM** — `/formats/gsm/`
- **GSRT** — `/formats/gsrt/`
- **HCOM** — `/formats/hcom/`
- **HTK** — `/formats/htk/`
- **IMA** — `/formats/ima/`
- **IRCAM** — `/formats/ircam/`
- **M4A** — `/formats/m4a/`
- **M4R** — `/formats/m4r/`
- **MAUD** — `/formats/maud/`
- **MP2** — `/formats/mp2/`
- **MP3** — `/formats/mp3/`
- **NIST** — `/formats/nist/`
- **OGA** — `/formats/oga/`
- **OGG** — `/formats/ogg/`
- **OPUS** — `/formats/opus/`
- **PAF** — `/formats/paf/`
- **PRC** — `/formats/prc/`
- **PVF** — `/formats/pvf/`
- **RA** — `/formats/ra/`
- **SD2** — `/formats/sd2/`
- **SHN** — `/formats/shn/`
- **SLN** — `/formats/sln/`
- **SMP** — `/formats/smp/`
- **SND** — `/formats/snd/`
- **SNDR** — `/formats/sndr/`
- **SNDT** — `/formats/sndt/`
- **SOU** — `/formats/sou/`
- **SPH** — `/formats/sph/`
- **SPX** — `/formats/spx/`
- **TAK** — `/formats/tak/`
- **TTA** — `/formats/tta/`
- **TXW** — `/formats/txw/`
- **VMS** — `/formats/vms/`
- **VOC** — `/formats/voc/`
- **VOX** — `/formats/vox/`
- **VQF** — `/formats/vqf/`
- **W64** — `/formats/w64/`
- **WAV** — `/formats/wav/`
- **WMA** — `/formats/wma/`
- **WV** — `/formats/wv/`
- **WVE** — `/formats/wve/`
- **XA** — `/formats/xa/`

## CAD

- **DXF** — `/formats/dxf/`

## Documents

- **ABW** — `/formats/abw/`
- **AW** — `/formats/aw/`
- **CSV** — `/formats/csv/`
- **DBK** — `/formats/dbk/`
- **DJVU** — `/formats/djvu/`
- **DOC** — `/formats/doc/`
- **DOCM** — `/formats/docm/`
- **DOCX** — `/formats/docx/`
- **DOT** — `/formats/dot/`
- **DOTM** — `/formats/dotm/`
- **DOTX** — `/formats/dotx/`
- **HTML** — `/formats/html/`
- **KWD** — `/formats/kwd/`
- **ODT** — `/formats/odt/`
- **OXPS** — `/formats/oxps/`
- **PDF** — `/formats/pdf/`
- **RTF** — `/formats/rtf/`
- **SXW** — `/formats/sxw/`
- **TXT** — `/formats/txt/`
- **WPS** — `/formats/wps/`
- **XLS** — `/formats/xls/`
- **XLSX** — `/formats/xlsx/`
- **XPS** — `/formats/xps/`

## EBooks

- **AZW3** — `/formats/azw3/`
- **EPUB** — `/formats/epub/`
- **FB2** — `/formats/fb2/`
- **LRF** — `/formats/lrf/`
- **MOBI** — `/formats/mobi/`
- **PDB** — `/formats/pdb/`
- **RB** — `/formats/rb/`
- **SNB** — `/formats/snb/`
- **TCR** — `/formats/tcr/`

## Fonts

- **AFM** — `/formats/afm/`
- **BIN** — `/formats/bin/`
- **CFF** — `/formats/cff/`
- **CID** — `/formats/cid/`
- **DFONT** — `/formats/dfont/`
- **OTF** — `/formats/otf/`
- **PFA** — `/formats/pfa/`
- **PFB** — `/formats/pfb/`
- **PS** — `/formats/ps/`
- **PT3** — `/formats/pt3/`
- **SFD** — `/formats/sfd/`
- **T11** — `/formats/t11/`
- **T42** — `/formats/t42/`
- **TTF** — `/formats/ttf/`
- **UFO** — `/formats/ufo/`
- **WOFF** — `/formats/woff/`

## Images

- **3FR** — `/formats/3fr/`
- **ARW** — `/formats/arw/`
- **AVIF** — `/formats/avif/`
- **BMP** — `/formats/bmp/`
- **CR2** — `/formats/cr2/`
- **CRW** — `/formats/crw/`
- **CUR** — `/formats/cur/`
- **DCM** — `/formats/dcm/`
- **DCR** — `/formats/dcr/`
- **DDS** — `/formats/dds/`
- **DNG** — `/formats/dng/`
- **ERF** — `/formats/erf/`
- **EXR** — `/formats/exr/`
- **FAX** — `/formats/fax/`
- **FTS** — `/formats/fts/`
- **G3** — `/formats/g3/`
- **G4** — `/formats/g4/`
- **GIF** — `/formats/gif/`
- **GV** — `/formats/gv/`
- **HDR** — `/formats/hdr/`
- **HEIC** — `/formats/heic/`
- **HEIF** — `/formats/heif/`
- **HRZ** — `/formats/hrz/`
- **ICO** — `/formats/ico/`
- **IIQ** — `/formats/iiq/`
- **IPL** — `/formats/ipl/`
- **JBG** — `/formats/jbg/`
- **JBIG** — `/formats/jbig/`
- **JFI** — `/formats/jfi/`
- **JFIF** — `/formats/jfif/`
- **JIF** — `/formats/jif/`
- **JNX** — `/formats/jnx/`
- **JP2** — `/formats/jp2/`
- **JPE** — `/formats/jpe/`
- **JPEG** — `/formats/jpeg/`
- **JPG** — `/formats/jpg/`
- **JPS** — `/formats/jps/`
- **K25** — `/formats/k25/`
- **KDC** — `/formats/kdc/`
- **MAC** — `/formats/mac/`
- **MAP** — `/formats/map/`
- **MEF** — `/formats/mef/`
- **MNG** — `/formats/mng/`
- **MRW** — `/formats/mrw/`
- **MTV** — `/formats/mtv/`
- **NEF** — `/formats/nef/`
- **NRW** — `/formats/nrw/`
- **ORF** — `/formats/orf/`
- **OTB** — `/formats/otb/`
- **PAL** — `/formats/pal/`
- **PALM** — `/formats/palm/`
- **PAM** — `/formats/pam/`
- **PBM** — `/formats/pbm/`
- **PCD** — `/formats/pcd/`
- **PCT** — `/formats/pct/`
- **PCX** — `/formats/pcx/`
- **PDB** — `/formats/pdb/`
- **PEF** — `/formats/pef/`
- **PES** — `/formats/pes/`
- **PFM** — `/formats/pfm/`
- **PGM** — `/formats/pgm/`
- **PGX** — `/formats/pgx/`
- **PICON** — `/formats/picon/`
- **PICT** — `/formats/pict/`
- **PIX** — `/formats/pix/`
- **PLASMA** — `/formats/plasma/`
- **PNG** — `/formats/png/`
- **PNM** — `/formats/pnm/`
- **PPM** — `/formats/ppm/`
- **PSD** — `/formats/psd/`
- **PWP** — `/formats/pwp/`
- **RAF** — `/formats/raf/`
- **RAS** — `/formats/ras/`
- **RGB** — `/formats/rgb/`
- **RGBA** — `/formats/rgba/`
- **RGBO** — `/formats/rgbo/`
- **RGF** — `/formats/rgf/`
- **RLA** — `/formats/rla/`
- **RLE** — `/formats/rle/`
- **RW2** — `/formats/rw2/`
- **SCT** — `/formats/sct/`
- **SFW** — `/formats/sfw/`
- **SGI** — `/formats/sgi/`
- **SIX** — `/formats/six/`
- **SIXEL** — `/formats/sixel/`
- **SR2** — `/formats/sr2/`
- **SRF** — `/formats/srf/`
- **SUN** — `/formats/sun/`
- **SVG** — `/formats/svg/`
- **TGA** — `/formats/tga/`
- **TIFF** — `/formats/tiff/`
- **TIM** — `/formats/tim/`
- **TM2** — `/formats/tm2/`
- **UYVY** — `/formats/uyvy/`
- **VIFF** — `/formats/viff/`
- **VIPS** — `/formats/vips/`
- **WBMP** — `/formats/wbmp/`
- **WEBP** — `/formats/webp/`
- **WMZ** — `/formats/wmz/`
- **WPG** — `/formats/wpg/`
- **X3F** — `/formats/x3f/`
- **XBM** — `/formats/xbm/`
- **XC** — `/formats/xc/`
- **XCF** — `/formats/xcf/`
- **XPM** — `/formats/xpm/`
- **XV** — `/formats/xv/`
- **XWD** — `/formats/xwd/`
- **YUV** — `/formats/yuv/`

## Presentations

- **ODP** — `/formats/odp/`
- **POT** — `/formats/pot/`
- **POTM** — `/formats/potm/`
- **POTX** — `/formats/potx/`
- **PPS** — `/formats/pps/`
- **PPSM** — `/formats/ppsm/`
- **PPSX** — `/formats/ppsx/`
- **PPT** — `/formats/ppt/`
- **PPTM** — `/formats/pptm/`
- **PPTX** — `/formats/pptx/`

## Vectors

- **AFF** — `/formats/aff/`
- **AI** — `/formats/ai/`
- **CCX** — `/formats/ccx/`
- **CDR** — `/formats/cdr/`
- **CDT** — `/formats/cdt/`
- **CGM** — `/formats/cgm/`
- **CMX** — `/formats/cmx/`
- **DST** — `/formats/dst/`
- **EMF** — `/formats/emf/`
- **EPS** — `/formats/eps/`
- **EXP** — `/formats/exp/`
- **FIG** — `/formats/fig/`
- **PCS** — `/formats/pcs/`
- **PES** — `/formats/pes/`
- **PLT** — `/formats/plt/`
- **PS** — `/formats/ps/`
- **SK** — `/formats/sk/`
- **SK1** — `/formats/sk1/`
- **SVG** — `/formats/svg/`
- **WMF** — `/formats/wmf/`

## Videos

- **3G2** — `/formats/3g2/`
- **3GP** — `/formats/3gp/`
- **AAF** — `/formats/aaf/`
- **ASF** — `/formats/asf/`
- **AV1** — `/formats/av1/`
- **AVCHD** — `/formats/avchd/`
- **AVI** — `/formats/avi/`
- **CAVS** — `/formats/cavs/`
- **DIVX** — `/formats/divx/`
- **DV** — `/formats/dv/`
- **F4V** — `/formats/f4v/`
- **FLV** — `/formats/flv/`
- **HEVC** — `/formats/hevc/`
- **M2TS** — `/formats/m2ts/`
- **M2V** — `/formats/m2v/`
- **M4V** — `/formats/m4v/`
- **MJPEG** — `/formats/mjpeg/`
- **MKV** — `/formats/mkv/`
- **MOD** — `/formats/mod/`
- **MOV** — `/formats/mov/`
- **MP4** — `/formats/mp4/`
- **MPEG** — `/formats/mpeg/`
- **MPEG-2** — `/formats/mpeg2/`
- **MPG** — `/formats/mpg/`
- **MTS** — `/formats/mts/`
- **MXF** — `/formats/mxf/`
- **OGV** — `/formats/ogv/`
- **RM** — `/formats/rm/`
- **RMVB** — `/formats/rmvb/`
- **SWF** — `/formats/swf/`
- **TOD** — `/formats/tod/`
- **TS** — `/formats/ts/`
- **VOB** — `/formats/vob/`
- **WEBM** — `/formats/webm/`
- **WMV** — `/formats/wmv/`
- **WTV** — `/formats/wtv/`
- **XVID** — `/formats/xvid/`
