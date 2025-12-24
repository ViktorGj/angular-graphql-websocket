import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { map, Observable } from 'rxjs';
import {
  GET_TODOS,
  ADD_TODO,
  UPDATE_TODO,
  DELETE_TODO,
  SEARCH_TODOS,
  TODO_ADDED_SUBSCRIPTION,
} from '../graphql/graphql.operations';
import { AddTodoResponse, DeleteTodoResponse, GetTodosResponse, SearchTodosResponse, Todo, TodoAddedSubscriptionResponse, UpdateTodoResponse } from '../models/todo.model';

@Injectable({
  providedIn: 'root',
})
export class GraphqlApiService {
  constructor(private apollo: Apollo) {}

  getTodos(): Observable<Todo[]> {
    return this.apollo
      .watchQuery<GetTodosResponse>({ // Specify the expected data type for response
        query: GET_TODOS,
        fetchPolicy: 'cache-and-network', // Ensure data freshness
      })
      .valueChanges.pipe(
        map((result) => {
          // You might check result.loading, result.error here if needed
          return result.data.todos;
        })
      );
  }

  /**
   * Searches for todos based on a text query.
   * Returns an Observable of Todo array.
   */
  searchTodos(searchText: string): Observable<Todo[]> {
    return this.apollo
      .watchQuery<SearchTodosResponse>({
        query: SEARCH_TODOS,
        variables: { searchText },
        fetchPolicy: 'cache-and-network',
      })
      .valueChanges.pipe(
        map((result) => {
          return result.data.searchTodos;
        })
      );
  }

  /**
   * Adds a new todo.
   * Returns an Observable of the newly added Todo.
   */
  addTodo(title: string): Observable<Todo> {
    return this.apollo
      .mutate<AddTodoResponse>({
        mutation: ADD_TODO,
        variables: { title },
      })
      .pipe(
        map((result) => {
          if (!result.data?.addTodo) {
            throw new Error('Failed to add todo: No data returned.');
          }
          return result.data.addTodo;
        })
      );
  }

  /**
   * Updates an existing todo's completed status.
   * Returns an Observable of the updated Todo.
   */
  updateTodo(id: string, completed: boolean): Observable<Todo> {
    return this.apollo
      .mutate<UpdateTodoResponse>({
        mutation: UPDATE_TODO,
        variables: { id, completed },
      })
      .pipe(
        map((result) => {
          if (!result.data?.updateTodo) {
            throw new Error('Failed to update todo: No data returned.');
          }
          return result.data.updateTodo;
        })
      );
  }

  /**
   * Deletes a todo.
   * Returns an Observable of the ID of the deleted todo.
   */
  deleteTodo(id: string): Observable<{ id: string }> {
    return this.apollo
      .mutate<DeleteTodoResponse>({
        mutation: DELETE_TODO,
        variables: { id },
      })
      .pipe(
        map((result) => {
          if (!result.data?.deleteTodo) {
            throw new Error('Failed to delete todo: No data returned.');
          }
          return result.data.deleteTodo;
        })
      );
  }

  todoAdded(): Observable<Todo> {
    return this.apollo
    .subscribe<TodoAddedSubscriptionResponse>({
      query: TODO_ADDED_SUBSCRIPTION
    })
    .pipe(
      map(result => {
        if(!result.data?.todoAdded) {
          throw new Error('Subscription failed: No todoAdded data received.');
        }
        return result.data.todoAdded
      })
    )
  }

}
