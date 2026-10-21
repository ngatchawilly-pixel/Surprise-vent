import Image from "next/image";

interface Props {
  src: string | null | undefined;
  alt: string;
  emoji?: string | null;
  sizes?: string;
  priority?: boolean;
  className?: string;
}

/** Image produit avec repli élégant (dégradé + emoji) tant qu'aucune photo n'est téléversée. */
export function ProductImage({ src, alt, emoji, sizes = "(min-width:1024px) 25vw, 50vw", priority, className = "" }: Props) {
  if (!src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-rose via-secondary-fixed/60 to-gold-light/50 text-5xl ${className}`}
      >
        <span aria-hidden="true">{emoji ?? "🎁"}</span>
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={`object-cover ${className}`}
    />
  );
}
