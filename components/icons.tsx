/**
 * Icon system — Lucide, exclusively.
 *
 * Every icon in the app is a Lucide stroke icon (lucide-react). This module is
 * a thin alias layer so existing `@/components/icons` imports keep working
 * while the whole app renders one consistent icon family. No hand-drawn SVGs,
 * no emoji, no mixed systems. Size/align icons via className (h-4 w-4 …).
 */
export {
  Search as SearchIcon,
  Menu as MenuIcon,
  X as CloseIcon,
  ArrowRight as ArrowRightIcon,
  ArrowUpRight as ArrowUpRightIcon,
  ChevronRight as ChevronRightIcon,
  ChevronDown as ChevronDownIcon,
  FlaskConical as FlaskIcon,
  FlaskRound as VolumeFlaskIcon,
  Linkedin as LinkedInIcon,
  MessageCircle as WhatsAppIcon,
  Mail as MailIcon,
  Phone as PhoneIcon,
  ShieldCheck as ShieldIcon,
  FileText as DocumentIcon,
  Check as CheckIcon,
  SlidersHorizontal as FilterIcon,
  Star as StarIcon,
  ExternalLink as ExternalLinkIcon,
} from "lucide-react";
