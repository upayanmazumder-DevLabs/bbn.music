/**
 * Format a number as GBP currency.
 * @param amount - The amount to format
 * @returns Formatted currency string (e.g., "£10.00")
 */
export function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('en-GB', {
		style: 'currency',
		currency: 'GBP',
	}).format(amount);
}
