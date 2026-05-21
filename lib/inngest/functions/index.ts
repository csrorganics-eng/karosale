import { orderPlacedFunction } from "./order-placed";
import { orderStatusChangedFunction } from "./order-status-changed";
import { packagingTagGenerateFunction } from "./packaging-tag-generate";
import { lowStockAlertFunction } from "./low-stock-alert";

export const inngestFunctions = [
  orderPlacedFunction,
  orderStatusChangedFunction,
  packagingTagGenerateFunction,
  lowStockAlertFunction,
];
