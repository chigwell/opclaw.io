import { cn } from "@/lib/utils";

export interface TestimonialAuthor {
  name: string;
  handle: string;
  avatar?: string;
}

export interface TestimonialCardProps {
  author: TestimonialAuthor;
  text: string;
  href?: string;
  className?: string;
}

export function TestimonialCard({
  author,
  text,
  href,
  className,
}: TestimonialCardProps) {
  const Card = href ? "a" : "div";
  const initial = author.name?.trim()?.[0]?.toUpperCase() ?? "?";

  return (
    <Card
      {...(href
        ? { href, target: "_blank", rel: "noreferrer" }
        : {})}
      className={cn(
        "flex flex-col rounded-lg border border-white/10",
        "bg-gradient-to-b from-white/5 to-white/[0.02]",
        "p-4 text-start sm:p-6",
        "hover:from-white/10 hover:to-white/[0.04]",
        "max-w-[320px] sm:max-w-[320px]",
        "transition-colors duration-300",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white/10 text-sm font-semibold text-white/80">
          {author.avatar ? (
            <img
              src={author.avatar}
              alt={author.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            initial
          )}
        </div>
        <div className="flex flex-col items-start">
          <h3 className="text-md font-semibold leading-none text-white">
            {author.name}
          </h3>
          <p className="text-sm text-white/50">{author.handle}</p>
        </div>
      </div>
      <p className="sm:text-md mt-4 text-sm text-white/60">{text}</p>
    </Card>
  );
}
