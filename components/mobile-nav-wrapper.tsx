import { MobileNav } from '@/components/mobile-nav';

export function MobileNavWrapper({ loggedIn, isAdmin }: { loggedIn: boolean; isAdmin: boolean }) {
  return <MobileNav loggedIn={loggedIn} isAdmin={isAdmin} />;
}
