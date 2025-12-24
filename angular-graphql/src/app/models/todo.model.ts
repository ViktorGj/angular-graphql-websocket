export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

// Define the expected response structure for queries
export interface GetTodosResponse {
  todos: Todo[];
}

export interface SearchTodosResponse {
  searchTodos: Todo[]; // This matches the 'searchTodos' field in your server's Query type
}

// Define expected response structure for mutations (for type safety)
export interface AddTodoResponse {
  addTodo: Todo; // This matches the 'addTodo' field in your server's Mutation type
}

export interface UpdateTodoResponse {
  updateTodo: Todo; // This matches the 'updateTodo' field in your server's Mutation type
}

export interface DeleteTodoResponse {
  deleteTodo: { id: string }; // This matches the 'deleteTodo' field in your server's Mutation type
}

export interface TodoAddedSubscriptionResponse {
  todoAdded: Todo
}