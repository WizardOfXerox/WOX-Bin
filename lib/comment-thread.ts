export type ThreadableComment = {
  id: number;
  parentId: number | null;
  createdAt: string;
  username: string | null;
  displayName: string | null;
};

export type ThreadedComment<T extends ThreadableComment> = T & {
  depth: number;
  parentAuthor: string | null;
};

type CommentNode<T extends ThreadableComment> = {
  comment: T;
  children: CommentNode<T>[];
};

export function commentAuthorLabel(comment: Pick<ThreadableComment, "displayName" | "username">) {
  return comment.displayName || comment.username || "User";
}

export function buildThreadedComments<T extends ThreadableComment>(comments: T[]): Array<ThreadedComment<T>> {
  const ordered = [...comments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const nodes = new Map<number, CommentNode<T>>();
  for (const comment of ordered) {
    nodes.set(comment.id, { comment, children: [] });
  }

  const roots: CommentNode<T>[] = [];
  for (const comment of ordered) {
    const node = nodes.get(comment.id);
    if (!node) continue;
    const parent = comment.parentId != null ? nodes.get(comment.parentId) : null;
    if (parent && parent !== node) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const threaded: Array<ThreadedComment<T>> = [];
  const visit = (node: CommentNode<T>, depth: number, parentAuthor: string | null) => {
    threaded.push({
      ...node.comment,
      depth,
      parentAuthor
    });

    const author = commentAuthorLabel(node.comment);
    for (const child of node.children) {
      visit(child, Math.min(depth + 1, 3), author);
    }
  };

  for (const root of roots) {
    visit(root, 0, null);
  }

  return threaded;
}
