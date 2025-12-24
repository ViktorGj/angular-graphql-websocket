import { ApplicationConfig, inject } from '@angular/core';
import { ApolloClientOptions, InMemoryCache, split } from '@apollo/client/core';
import { Apollo, APOLLO_OPTIONS } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { createClient } from 'graphql-ws';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';

const httpUri = 'http://localhost:4000/graphql'; // url for Queries, Mutations
const wsUri = 'ws://localhost:4000/graphql'; // WebSocket url for Subscriptions

export function apolloOptionsFactory(): ApolloClientOptions<any> {
  const httpLink = inject(HttpLink);
  const http = httpLink.create({ uri: httpUri });

  const client = createClient({
    url: wsUri,
    connectionParams: async () => {
      return {}; // optional connection parameters for auth over WS
    },
  });

  const ws = new GraphQLWsLink(client);

  const link = split(
    ({ query }) => {
      const definition = getMainDefinition(query);
      return (
        definition.kind === 'OperationDefinition' &&
        definition.operation === 'subscription'
      );
    },
    ws,
    http
  );

  return {
    link,
    cache: new InMemoryCache(),
  };
}

export const graphqlProvider: ApplicationConfig['providers'] = [
  Apollo,
  {
    provide: APOLLO_OPTIONS,
    useFactory: apolloOptionsFactory,
  },
];
