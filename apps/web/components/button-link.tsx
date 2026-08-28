import Link from "next/link"
import type { ComponentProps } from "react"
import { type VariantProps } from "class-variance-authority"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

type ButtonLinkProps = ComponentProps<typeof Link> &
  VariantProps<typeof buttonVariants>

/**
 * A Next.js Link styled to look like a Button.
 * Used instead of <Button asChild> because the base-ui Button
 * does not support the asChild prop.
 */
export function ButtonLink({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}
