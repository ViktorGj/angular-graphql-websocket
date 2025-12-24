import { gql } from 'apollo-angular';

// --- QUERIES ---

export const GET_TODOS = gql`
  query GetTodos {
    todos {
      id
      title
      completed
      createdAt
    }
  }
`;

export const GET_TODO_BY_ID = gql`
  query GetTodoById($id: ID!) {
    todo(id: $id) {
      id
      title
      completed
      createdAt
    }
  }
`;

export const SEARCH_TODOS = gql`
  query SearchTodos($searchText: String!) {
    searchTodos(searchText: $searchText) {
      id
      title
      completed
      createdAt
    }
  }
`;

// --- MUTATIONS ---

export const ADD_TODO = gql`
  mutation AddTodo($title: String!) {
    addTodo(title: $title) {
      id
      title
      completed
      createdAt
    }
  }
`;

export const UPDATE_TODO = gql`
  mutation UpdateTodo($id: ID!, $completed: Boolean) {
    updateTodo(id: $id, completed: $completed) {
      id
      title
      completed
      createdAt
    }
  }
`;

export const DELETE_TODO = gql`
  mutation DeleteTodo($id: ID!) {
    deleteTodo(id: $id) {
      id # The server returns the ID of the deleted item
    }
  }
`;

export const TODO_ADDED_SUBSCRIPTION = gql`
  subscription TodoAdded {
    todoAdded {
      id
      title
      completed
      createdAt
    }
  }
`;
