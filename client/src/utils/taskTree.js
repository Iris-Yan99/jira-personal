/**
 * Build a tree structure from a flat task array.
 * @param {Object[]} tasks
 * @returns {{ roots: Object[], childrenMap: Record<number, Object[]>, tasksById: Record<number, Object> }}
 */
export function buildTree(tasks) {
  const tasksById = {};
  const childrenMap = {};

  tasks.forEach((t) => {
    tasksById[t.id] = t;
    childrenMap[t.id] = [];
  });

  tasks.forEach((t) => {
    if (t.parent_id && childrenMap[t.parent_id]) {
      childrenMap[t.parent_id].push(t);
    }
  });

  const roots = tasks.filter((t) => !t.parent_id);
  return { roots, childrenMap, tasksById };
}

/**
 * Calculate progress for a task node.
 * - Leaf node (no children): returns task.progress_percent
 * - Parent node: returns % of direct children with status === 'done'
 * @param {number} taskId
 * @param {Record<number, Object[]>} childrenMap
 * @param {Record<number, Object>} tasksById
 * @returns {number} 0-100
 */
export function calcProgress(taskId, childrenMap, tasksById) {
  const task = tasksById[taskId];
  const children = childrenMap[taskId];
  if (!children || children.length === 0) {
    return task?.progress_percent ?? 0;
  }
  const doneCount = children.filter((c) => c.status === 'done').length;
  return Math.round((doneCount / children.length) * 100);
}

/**
 * Get all descendant IDs of a task (BFS).
 * Used to prevent circular re-parenting in parent selector.
 * @param {number} taskId
 * @param {Record<number, Object[]>} childrenMap
 * @returns {Set<number>}
 */
export function getDescendantIds(taskId, childrenMap) {
  const result = new Set();
  const queue = [...(childrenMap[taskId] || [])];
  while (queue.length > 0) {
    const node = queue.shift();
    result.add(node.id);
    (childrenMap[node.id] || []).forEach((c) => queue.push(c));
  }
  return result;
}
