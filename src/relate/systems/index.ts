/**
 * SubSystems Module - Personal knowledge domain management
 *
 * Exports service and routes for managing sub-systems in PKA-Relate.
 *
 * @module relate/systems
 */

export {
  SubSystem,
  SubSystemCreate,
  SubSystemIcon,
  SystemLink,
  ContentItem,
  ContentItemCreate,
  Pagination,
  GraphNode,
  GraphEdge,
  GraphVisualizationData,
  SubSystemService,
  subSystemService
} from './service.js';

export { createSystemsRouter } from './routes.js';
