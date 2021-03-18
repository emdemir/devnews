/** @file Interfaces used for pagination. */

// Holds information about a paginated collection of objects.
interface Pagination<T> {
    // The page number.
    page: number;
    // The items for this page.
    items: T[];
    // Whether there's a previous page.
    has_prev_page: boolean;
    // Whether there's a next page.
    has_next_page: boolean;
};

export default Pagination;
