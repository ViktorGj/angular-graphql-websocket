import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { GraphqlApiService } from './services/graphql-api.service';
import { CommonModule } from '@angular/common';
import {
  catchError,
  debounceTime,
  Observable,
  of,
  startWith,
  Subject,
  Subscription,
  switchMap,
  tap,
} from 'rxjs';
import { FormsModule } from '@angular/forms';
import { Todo } from './models/todo.model';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import {MatCheckboxModule} from '@angular/material/checkbox';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule, MatButtonModule, MatInputModule, MatCheckboxModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  todos = signal<Todo[]>([]);
  loading = signal<boolean>(true);
  error = signal<any>(undefined);
  newTodoTitle = signal<string>('');
  searchQuery = signal<string>('');
  newTodoNotification = signal<string | null>(null);

  private refreshTrigger$ = new Subject<void>();
  private searchInputSubject = new Subject<string>();

  private todosDataSource$: Observable<Todo[]>;
  private todosSubscription: Subscription | undefined;
  private todosAddedSubscription: Subscription | undefined;

  constructor(private todosGraphqlService: GraphqlApiService) {
    this.todosDataSource$ = this.refreshTrigger$.pipe(
      startWith(undefined as void),
      switchMap(() => {
        this.loading.set(true);
        this.error.set(undefined);

        const currentSearchQuery = this.searchQuery();
        let dataFetchObservable: Observable<Todo[]>;

        if (currentSearchQuery.trim()) {
          dataFetchObservable = this.todosGraphqlService.searchTodos(
            currentSearchQuery.trim()
          );
        } else {
          dataFetchObservable = this.todosGraphqlService.getTodos();
        }

        return dataFetchObservable.pipe(
          tap(() => this.loading.set(false)),
          catchError((err) => {
            this.loading.set(false);
            this.error.set(err);
            console.error('Data source error:', err);
            return of([]);
          })
        );
      })
    );

    this.searchInputSubject.pipe(debounceTime(300)).subscribe((query) => {
      this.searchQuery.set(query);
      this.refreshTrigger$.next();
    });
  }

  ngOnInit() {
    this.todosSubscription = this.todosDataSource$.subscribe((data) => {
      this.todos.set(data);
    });

    this.todosAddedSubscription = this.todosGraphqlService
      .todoAdded()
      .subscribe({
        next: (todoAdded) => {
          this.newTodoNotification.set(`Todo "${todoAdded.title}" was added.`);

          setTimeout(() => {
            this.newTodoNotification.set(null);
          }, 3000);

          // only update the list through ws subscription if the search is not active
          if (!this.searchQuery()) {
            this.todos.update((currentTodos) => {
              if (!currentTodos.find((t) => t.id === todoAdded.id)) {
                return [todoAdded, ...currentTodos];
              }
              return currentTodos;
            });
          }
        },
        error: (err) => {
          console.error('Todo added subscription error:', err);
          // optionally add subscription specific error to show on the UI
        },
      });
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.refreshTrigger$.next();
  }

  onSearchKeyup(): void {
    this.searchInputSubject.next(this.searchQuery());
  }

  addTodo(): void {
    const title = this.newTodoTitle();
    if (!title.trim()) return;

    this.todosGraphqlService.addTodo(title.trim()).subscribe({
      next: (newTodo) => {
        this.newTodoTitle.set('');
        // this.todos.update((currentTodos) => [newTodo, ...currentTodos]);

        this.todos.update((currentTodos) => {
          if (!currentTodos.find((t) => t.id === newTodo.id)) {
            return [newTodo, ...currentTodos];
          }
          return currentTodos;
        });
      },
      error: (err) => {
        console.error('Error adding todo:', err);
        this.error.set(err);
      },
    });
  }

  updateTodo(id: string, event: Event): void {
    const completed = (event.target as HTMLInputElement).checked;

    this.todosGraphqlService.updateTodo(id, completed).subscribe({
      next: (updatedTodo) => {
        this.todos.update((currentTodos) =>
          currentTodos.map((todo) =>
            todo.id === updatedTodo.id
              ? { ...todo, completed: updatedTodo.completed }
              : todo
          )
        );
      },
      error: (err: Error) => {
        console.error('Error updating todo:', err);
        this.error.set(err);
      },
    });
  }

  deleteTodo(id: string): void {
    this.todosGraphqlService.deleteTodo(id).subscribe({
      next: () => {
        this.todos.update((currentTodos) =>
          currentTodos.filter((todo) => todo.id !== id)
        );
      },
      error: (err: Error) => {
        console.error('Error deleting todo:', err);
        this.error.set(err);
      },
    });
  }

  ngOnDestroy(): void {
    this.todosSubscription?.unsubscribe();
    this.todosAddedSubscription?.unsubscribe();
    this.refreshTrigger$.complete();
    this.searchInputSubject.complete();
  }
}
