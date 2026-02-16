/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounts from "../accounts.js";
import type * as activities from "../activities.js";
import type * as agents from "../agents.js";
import type * as businessContext from "../businessContext.js";
import type * as channels from "../channels.js";
import type * as documents from "../documents.js";
import type * as lib_auth from "../lib/auth.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as routines from "../routines.js";
import type * as tasks from "../tasks.js";
import type * as tenants from "../tenants.js";
import type * as types from "../types.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accounts: typeof accounts;
  activities: typeof activities;
  agents: typeof agents;
  businessContext: typeof businessContext;
  channels: typeof channels;
  documents: typeof documents;
  "lib/auth": typeof lib_auth;
  messages: typeof messages;
  notifications: typeof notifications;
  routines: typeof routines;
  tasks: typeof tasks;
  tenants: typeof tenants;
  types: typeof types;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
