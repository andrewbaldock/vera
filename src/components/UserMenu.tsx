import {
  AArrowDown,
  AArrowUp,
  ALargeSmall,
  Check,
  LogOut,
  Monitor,
  Moon,
  Sun,
  UserRound,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme, type ThemePreference } from '@/hooks/useTheme'
import { useUiScale, type UiScale } from '@/hooks/useUiScale'
import { CURRENT_USER } from '@/lib/session'
import type { ReviewUser } from '@/types/review'

/**
 * The signed-in user, and their settings. An avatar rather than a gear: it says
 * whose session this is, which matters on a screen that records who signed off
 * on a document, and settings are reached *through* your account rather than
 * beside it.
 */

const THEMES: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
]

/**
 * Three stops, and the middle one is the shipped default. "Comfortable" is the
 * established word for the middle density in this kind of menu, which makes it
 * the one a user has met before.
 */
const SIZES: { value: UiScale; label: string; icon: typeof Sun }[] = [
  { value: 'compact', label: 'Compact', icon: AArrowDown },
  { value: 'comfortable', label: 'Comfortable', icon: ALargeSmall },
  { value: 'large', label: 'Large', icon: AArrowUp },
]

function initials(user: ReviewUser): string {
  return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase()
}

export function UserMenu({ user = CURRENT_USER }: { user?: ReviewUser } = {}) {
  const { preference, setTheme } = useTheme()
  const { scale, setScale } = useUiScale()
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

        {/* Present but inert. Account management and sessions belong to the
            platform this screen sits inside, not to a review page. */}
        <DropdownMenuItem disabled className="gap-2">
          <UserRound className="size-4" aria-hidden />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="gap-2">
          <LogOut className="size-4" aria-hidden />
          Log out
        </DropdownMenuItem>

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
              // The library's indicator is a dot in the left gutter. The icon
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

        <DropdownMenuSeparator />

        {/* Beside the theme, because both are answers to "how do I want to
            look at this", and both belong to the device. The document has its
            own zoom in the page bar: this moves the interface and leaves the
            pages alone. */}
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Text size
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={scale}
          onValueChange={(value) => setScale(value as UiScale)}
        >
          {SIZES.map(({ value, label, icon: Icon }) => (
            <DropdownMenuRadioItem
              key={value}
              value={value}
              className="gap-2 ps-2 [&>span:first-child]:hidden"
            >
              <Icon className="size-4 text-muted-foreground" aria-hidden />
              <span className="flex-1">{label}</span>
              {scale === value && <Check className="size-4" aria-hidden />}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        {/* Which build this is. A deployed link that cannot say what it is
            turns every "is that fixed yet?" into a guess on both sides. The
            same two facts are at /version.json for checking without a browser. */}
        <p className="px-2 py-1.5 text-xs text-muted-foreground tabular-nums">
          VERA v{__APP_VERSION__}{' '}
          <span className="opacity-70">({__BUILD_SHA__})</span>
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
