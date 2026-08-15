import { Check, Monitor, Moon, Sun } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme, type ThemePreference } from '@/hooks/useTheme'
import type { ReviewUser } from '@/types/review'

/**
 * The signed-in user, and their settings.
 *
 * An avatar is a better trigger than a gear here: it says whose session this is
 * — which matters on a screen that records who signed off on a document — and
 * settings are the thing you reach for *through* your account, not a separate
 * concern sitting beside it.
 */

const THEMES: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
]

function initials(user: ReviewUser): string {
  return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase()
}

export function UserMenu({ user }: { user: ReviewUser }) {
  const { preference, setTheme } = useTheme()
  const name = `${user.first_name} ${user.last_name}`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground transition-colors hover:bg-accent active:bg-accent focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
        >
          <span aria-hidden>{initials(user)}</span>
          <span className="sr-only">Account and settings for {name}</span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="z-50 w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span>{name}</span>
          <span className="text-xs font-normal text-muted-foreground">Reviewer</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Theme
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={preference}
          onValueChange={(value) => setTheme(value as ThemePreference)}
        >
          {THEMES.map(({ value, label, icon: Icon }) => (
            <DropdownMenuRadioItem
              key={value}
              value={value}
              // The library's indicator is a dot in the left gutter; the icon
              // reads faster and the check states the choice a second way, so
              // selection is never carried by position alone.
              className="gap-2 ps-2 [&>span:first-child]:hidden"
            >
              <Icon className="size-4 text-muted-foreground" aria-hidden />
              <span className="flex-1">{label}</span>
              {preference === value && <Check className="size-4" aria-hidden />}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
