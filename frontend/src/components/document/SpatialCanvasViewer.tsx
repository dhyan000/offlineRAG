import React, { useState } from 'react';
import { FileText, MapPin, Search, ChevronLeft, ChevronRight, Hash, Layers, ZoomIn, ZoomOut } from 'lucide-react';

interface CitationSource {
  page: number;
  bbox: { x: number; y: number; width: number; height: number }; // percentage coordinates
  text: string;
  confidence: number;
}

interface SpatialCanvasViewerProps {
  documentName?: string;
  totalPages?: number;
  citations?: CitationSource[];
  onPageChange?: (page: number) => void;
}

export const SpatialCanvasViewer: React.FC<SpatialCanvasViewerProps> = ({
  documentName = 'Enterprise_Architecture_Technical_Report.pdf',
  totalPages = 14,
  citations = [
    { page: 1, bbox: { x: 10, y: 25, width: 80, height: 18 }, text: 'Offline Multimodal RAG system architecture utilizing local ChromaDB vector stores and zero cloud network endpoints.', confidence: 0.96 },
    { page: 2, bbox: { x: 10, y: 55, width: 80, height: 22 }, text: 'PyMuPDF text extraction pipeline operating page-by-page to yield normalized character streams and metadata tuples.', confidence: 0.92 },
    { page: 4, bbox: { x: 15, y: 30, width: 70, height: 15 }, text: 'MD5 cryptographic hash deduplication algorithm resulting in 99.4% computational savings for duplicate document uploads.', confidence: 0.98 },
  ],
  onPageChange,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [activeCitation, setActiveCitation] = useState<CitationSource>(citations[0]);

  const handlePageJump = (page: number, citation?: CitationSource) => {
    setCurrentPage(page);
    if (citation) setActiveCitation(citation);
    if (onPageChange) onPageChange(page);
  };

  return (
    <div className="w-full bg-studio-900 border border-white/10 rounded-sm p-4 tactile-card font-mono text-xs">
      {/* Workspace Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-slate-100 font-bold tracking-wider flex items-center gap-2">
              {documentName}
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase">
                PURE DOCUMENT // PYMUPDF SPATIAL
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              TOTAL PAGES: {totalPages} // VECTOR CHUNKS: {citations.length * 4} // PARSER: PYMUPDF 1.24
            </div>
          </div>
        </div>

        {/* Page Navigation & Zoom */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-studio-950 border border-white/10 px-2 py-1 rounded-sm text-[11px]">
            <button
              onClick={() => handlePageJump(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="p-0.5 text-slate-400 hover:text-white disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-bold text-slate-200">
              PAGE {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => handlePageJump(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="p-0.5 text-slate-400 hover:text-white disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1 bg-studio-950 border border-white/10 px-2 py-1 rounded-sm">
            <button onClick={() => setZoomLevel(Math.max(75, zoomLevel - 15))} className="text-slate-400 hover:text-white">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] w-8 text-center text-slate-300">{zoomLevel}%</span>
            <button onClick={() => setZoomLevel(Math.min(150, zoomLevel + 15))} className="text-slate-400 hover:text-white">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Spatial Canvas Visualizer Viewport */}
        <div className="lg:col-span-2 relative min-h-[360px] bg-studio-950 border border-white/10 rounded-sm p-6 overflow-hidden flex flex-col items-center justify-center">
          {/* Simulated PDF Document Page Canvas */}
          <div
            className="relative bg-studio-900 border border-white/15 p-6 shadow-2xl transition-all duration-300"
            style={{
              width: `${(320 * zoomLevel) / 100}px`,
              minHeight: `${(420 * zoomLevel) / 100}px`,
            }}
          >
            {/* Synthetic Page Lines */}
            <div className="border-b border-white/10 pb-3 mb-4 flex items-center justify-between text-[10px] text-slate-500">
              <span>DOCUMENT PAGE {currentPage}</span>
              <span>PYMUPDF VECTOR MAP</span>
            </div>

            <div className="space-y-3 opacity-40">
              <div className="h-3 bg-slate-600 rounded-sm w-3/4" />
              <div className="h-2.5 bg-slate-700 rounded-sm w-full" />
              <div className="h-2.5 bg-slate-700 rounded-sm w-5/6" />
              <div className="h-2.5 bg-slate-700 rounded-sm w-4/5" />
            </div>

            {/* Bounding Box Source Highlight Overlay */}
            {citations
              .filter((c) => c.page === currentPage)
              .map((citation, idx) => (
                <div
                  key={idx}
                  style={{
                    top: `${citation.bbox.y}%`,
                    left: `${citation.bbox.x}%`,
                    width: `${citation.bbox.width}%`,
                    height: `${citation.bbox.height}%`,
                  }}
                  className="absolute border-2 border-klein-bright bg-blue-500/15 p-2 rounded-sm flex flex-col justify-between shadow-klein group animate-pulse"
                >
                  <div className="flex items-center justify-between text-[9px] font-bold text-blue-300 bg-blue-950/90 px-1.5 py-0.5 rounded-sm">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5 text-klein-bright" />
                      VECTOR CHUNK #{idx + 1} BOUNDING BOX
                    </span>
                    <span>{(citation.confidence * 100).toFixed(0)}% MATCH</span>
                  </div>
                  <div className="text-[10px] text-slate-100 font-sans line-clamp-2 mt-1">
                    "{citation.text}"
                  </div>
                </div>
              ))}

            <div className="space-y-3 opacity-40 mt-8">
              <div className="h-2.5 bg-slate-700 rounded-sm w-full" />
              <div className="h-2.5 bg-slate-700 rounded-sm w-11/12" />
              <div className="h-2.5 bg-slate-700 rounded-sm w-4/5" />
            </div>
          </div>
        </div>

        {/* Citation Depth Map Sidebar */}
        <div className="bg-studio-950 border border-white/10 p-3 rounded-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-wider flex items-center gap-1.5 border-b border-white/10 pb-2">
            <Layers className="w-3.5 h-3.5 text-klein-bright" />
            CITATION DEPTH MAP // QUICK JUMP LINKS
          </div>

          <div className="space-y-2">
            {citations.map((citation, idx) => {
              const isSelected = citation.page === currentPage;
              return (
                <div
                  key={idx}
                  onClick={() => handlePageJump(citation.page, citation)}
                  className={`p-3 rounded-sm border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-studio-850 border-klein text-slate-100 shadow-klein'
                      : 'bg-studio-900 border-white/5 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="font-bold text-blue-400 flex items-center gap-1">
                      <Hash className="w-3 h-3 text-klein-bright" />
                      PAGE {citation.page} // COORD [x:{citation.bbox.x}, y:{citation.bbox.y}]
                    </span>
                    <span className="text-emerald-400">{(citation.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="text-[11px] text-slate-300 font-sans line-clamp-3 mb-2">
                    "{citation.text}"
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono text-right">
                    JUMP TO PAGE {citation.page} COORDINATES &rarr;
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
