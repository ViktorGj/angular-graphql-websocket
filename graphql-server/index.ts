import express from 'express';
import { ApolloServer } from '@apollo/server';
import { createServer } from 'http';
import { expressMiddleware } from '@as-integrations/express5';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
// import { startStandaloneServer } from '@apollo/server/standalone';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import bodyParser from 'body-parser';
import { PubSub } from 'graphql-subscriptions';
import cors from 'cors';

// const cors = require('cors');
const port = 4000;
const TODO_ADDED_EVENT_NAME = 'TODO_ADDED';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

// GraphQL Schema (Types and Operations)
const typeDefs = `
  type Todo {
    id: ID!
    title: String!
    completed: Boolean!
    createdAt: String!
  }

  type Query {
    todos: [Todo!]!
    todo(id: ID!): Todo
    searchTodos(searchText: String!): [Todo!]!
  }

  type Mutation {
    addTodo(title: String!): Todo!
    updateTodo(id: ID!, completed: Boolean): Todo
    deleteTodo(id: ID!): Todo
  }

  type Subscription {
    todoAdded: Todo!
  }
`;

// Mock Data Storage
let todos: Todo[] = [
  {
    id: uuidv4(),
    title: 'Learn GraphQL',
    completed: false,
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    title: 'Build Angular App',
    completed: true,
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    title: 'Deploy to Netlify',
    completed: false,
    createdAt: new Date().toISOString()
  }
];

const pubSub = new PubSub();

const resolvers = {
  Query: {
    todos: (): Todo[] => todos,
    todo: (parent: any, { id }: { id: string }): Todo | undefined =>
      todos.find((todo) => todo.id === id),
    searchTodos: (
      parent: any,
      { searchText }: { searchText: string }
    ): Todo[] => {
      const lowerSearchText = searchText.toLowerCase();
      return todos.filter((todo) =>
        todo.title.toLowerCase().includes(lowerSearchText)
      );
    }
  },

  Mutation: {
    addTodo: (parent: any, { title }: { title: string }): Todo => {
      const newTodo: Todo = {
        id: uuidv4(),
        title,
        completed: false,
        createdAt: new Date().toISOString()
      };

      todos.push(newTodo);
      pubSub.publish(TODO_ADDED_EVENT_NAME, { todoAdded: newTodo });
      console.log('Todo added:', newTodo);
      return newTodo;
    },

    updateTodo: (
      parent: any,
      { id, completed }: { id: string; completed?: boolean }
    ): Todo | null => {
      const todoIndex = todos.findIndex((todo) => todo.id === id);
      if (todoIndex > -1) {
        todos[todoIndex] = {
          ...todos[todoIndex],
          completed:
            completed !== undefined ? completed : todos[todoIndex].completed
        };
        console.log('Todo updated:', todos[todoIndex]);
        return todos[todoIndex];
      }
      return null;
    },

    deleteTodo: (parent: any, { id }: { id: string }): Todo | null => {
      const initialLength = todos.length;
      const deletedTodo = todos.find((todo) => todo.id === id);
      todos = todos.filter((todo) => todo.id !== id);
      if (todos.length < initialLength && deletedTodo) {
        console.log('Todo deleted with ID:', id);
        return deletedTodo;
      }
      return null;
    }
  },

  Subscription: {
    todoAdded: {
      subscribe: () => pubSub.asyncIterableIterator([TODO_ADDED_EVENT_NAME])
    }
  }
};

async function startServer() {
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const app = express();
  const httpServer = createServer(app);

  // add CORS config
  app.use(cors({
    origin: ['http://localhost:4200', 'http://localhost:4201']
  }))

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql'
  });

  const wsServerCleanup = useServer({ schema }, wsServer);

  const apolloServer = new ApolloServer({
    schema,
    plugins: [
      // shutdown for the HTTP server
      ApolloServerPluginDrainHttpServer({ httpServer }),
      // shutdown for the ws server
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await wsServerCleanup.dispose();
            }
          };
        }
      }
    ]
  });

  await apolloServer.start();

  app.use('/graphql', bodyParser.json(), expressMiddleware(apolloServer));

  httpServer.listen(port, () => {
    console.log(`Server ready at http://localhost:${port}/graphql`);
    console.log(
      `Subscription endpoint ready at ws://localhost:${port}/graphql`
    );
  });
}

startServer();

// async function startApolloServer() {
//   const server = new ApolloServer<any>({
//     typeDefs,
//     resolvers
//   });

//   const { url } = await startStandaloneServer(server, {
//     listen: { port: 4000 }
//   });

//   console.log(`🚀 Server ready at ${url}`);
//   console.log(`Access GraphiQL at ${url}`);
// }

// startApolloServer();
