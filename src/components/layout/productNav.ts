export interface ProductNavItem {
    to: string;
    label: string;
    end?: boolean;
}

export const PRODUCT_NAV_ITEMS: ProductNavItem[] = [
    { to: "/", label: "Home", end: true },
    { to: "/practice", label: "Practice" },
    { to: "/review", label: "Review" },
    { to: "/progress", label: "Progress" },
    { to: "/library", label: "Library" },
];
