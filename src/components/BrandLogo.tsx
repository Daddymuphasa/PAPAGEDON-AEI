import { withBasePath } from "@/basePath";

export default function BrandLogo({ compact = false }: { compact?: boolean }) {
  return <span className={`brand-logo ${compact ? "brand-logo-compact" : ""}`} aria-hidden="true">
    <img src={withBasePath("/papagedon-wordmark.png")} alt="" />
  </span>;
}
