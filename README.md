# Building a Serverless GraphQL API with NestJS and AWS Lambda

NestJS and GraphQL are excellent tools for building modern APIs. When combined with AWS Lambda, they create a powerful stack for serverless applications. NestJS provides a modular, TypeScript-based framework for scalable server-side applications, GraphQL allows for precise and flexible data fetching, and AWS Lambda enables serverless execution for cost-effective and scalable backend solutions. In this blog, we’ll focus on building and testing a local GraphQL API with NestJS, using DynamoDB as the backend.

---

## Introduction to NestJS

NestJS is a progressive Node.js framework that provides a robust and modular architecture for building server-side applications. Inspired by Angular, it combines the best concepts from object-oriented programming, functional programming, and reactive programming. Its modular design and built-in GraphQL support make it ideal for scalable applications. Learn more in the [official NestJS documentation](https://docs.nestjs.com/).

---

## Why Choose GraphQL, DynamoDB, NestJS, and AWS Lambda?

Combining GraphQL, DynamoDB, NestJS, and AWS Lambda provides a powerful foundation for building APIs. GraphQL ensures efficient data fetching, DynamoDB offers a fully managed NoSQL database, NestJS organizes the application logic effectively, and AWS Lambda enables serverless execution, reducing infrastructure management.

### Benefits of This Stack:

1. **Efficiency**: GraphQL minimizes data transfer and optimizes client-server communication.
2. **Serverless Execution**: AWS Lambda eliminates the need to manage servers, scaling automatically based on demand.
3. **High Availability**: DynamoDB offers seamless scalability and low-latency performance.

---

## Prerequisites

1. **Node.js** installed on your machine.
2. **Docker setup** for local testing.
3. Basic knowledge of TypeScript, GraphQL, and AWS services.

### Set Up Dummy AWS Credentials

The AWS SDK requires credentials, even for local testing. Configure dummy credentials as follows:

```bash
aws configure
```

Use these dummy values:

- **Access Key ID**: `dummyAccessKeyId`
- **Secret Access Key**: `dummySecretAccessKey`
- **Default region**: `us-east-1` (or your preferred region)
- **Output format**: `json`

These credentials are used only for local operations and won't affect your real AWS account.

### Install DynamoDB Local:

#### Using Docker:

```bash
docker run -d -p 8000:8000 amazon/dynamodb-local
```

## Step 1: Create a DynamoDB Table

Run the following command using the AWS CLI:

```bash
aws dynamodb create-table \
    --table-name BlogPosts \
    --attribute-definitions AttributeName=id,AttributeType=S \
    --key-schema AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --endpoint-url http://localhost:8000
```

This creates a table named `BlogPosts` with a primary key `id` of type string.

---

## Step 2: Setting Up Your NestJS Application

The application we will build is a **Blog Post Management System**. This system allows users to create, retrieve, update, and delete blog posts using a GraphQL API.

### Install the NestJS CLI:

```bash
npm i -g @nestjs/cli
```

### Create a New Project:

```bash
nest new blog-management-api
cd blog-management-api
```

Choose npm as your preferred package manager when prompted.

### Add GraphQL, AWS SDK, and Other Dependencies:

```bash
npm install @nestjs/graphql @nestjs/apollo graphql-tools graphql aws-lambda aws-serverless-express
```

### Add Serverless Framework Dependencies:

```bash
npm install --save-dev serverless serverless-offline
```

---

## Step 3: Create Blog Module, Entity, Service, and Resolver

### Define the BlogPost Entity:

Edit `src/blog/entities/blog-post.entity.ts`:

```typescript
import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class BlogPost {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field()
  content: string;
}
```

### Implement the Blog Service:

Edit `src/blog/blog.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { DynamoDB } from 'aws-sdk';
import { BlogPost } from './entities/blog-post.entity';

@Injectable()
export class BlogService {
  private readonly dynamoDb = new DynamoDB.DocumentClient({ endpoint: 'http://localhost:8000', region: 'us-east-1' });
  private readonly tableName = 'BlogPosts';

  async findAll(): Promise<BlogPost[]> {
    const result = await this.dynamoDb.scan({ TableName: this.tableName }).promise();
    return result.Items as BlogPost[];
  }

  async create(title: string, content: string): Promise<BlogPost> {
    const newPost: BlogPost = { id: Date.now().toString(), title, content };
    await this.dynamoDb.put({ TableName: this.tableName, Item: newPost }).promise();
    return newPost;
  }

  async update(id: string, title: string, content: string): Promise<BlogPost> {
    await this.dynamoDb.update({
      TableName: this.tableName,
      Key: { id },
      UpdateExpression: 'set title = :title, content = :content',
      ExpressionAttributeValues: {
        ':title': title,
        ':content': content,
      },
    }).promise();
    return { id, title, content };
  }

  async delete(id: string): Promise<string> {
    await this.dynamoDb.delete({ TableName: this.tableName, Key: { id } }).promise();
    return id;
  }
}
```

### Implement the Blog Resolver:

Edit `src/blog/blog.resolver.ts`:

```typescript
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { BlogService } from './blog.service';
import { BlogPost } from './entities/blog-post.entity';

@Resolver(() => BlogPost)
export class BlogResolver {
  constructor(private readonly blogService: BlogService) {}

  @Query(() => [BlogPost])
  getAllPosts(): Promise<BlogPost[]> {
    return this.blogService.findAll();
  }

  @Mutation(() => BlogPost)
  createPost(@Args('title') title: string, @Args('content') content: string): Promise<BlogPost> {
    return this.blogService.create(title, content);
  }

  @Mutation(() => BlogPost)
  updatePost(@Args('id') id: string, @Args('title') title: string, @Args('content') content: string): Promise<BlogPost> {
    return this.blogService.update(id, title, content);
  }

  @Mutation(() => String)
  deletePost(@Args('id') id: string): Promise<string> {
    return this.blogService.delete(id);
  }
}
```

---

## Step 4: Configure GraphQL Module

### Update `AppModule`:

Edit `src/app.module.ts` to include the GraphQL module configuration:

```typescript
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { BlogModule } from './blog/blog.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      path: '/management'
    }),
    BlogModule,
  ],
})
export class AppModule {}
```
This configuration generates the GraphQL schema automatically.

### Update Main Application for AWS Lambda Compatibility

Edit `src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {createServer, proxy} from 'aws-serverless-express';
import { Handler, Context, Callback, APIGatewayEvent} from 'aws-lambda';
let cachedServer: any;

const bootstrapServer = async () => {
  const app = await NestFactory.create(AppModule, {cors: true});
  await app.init();
  return createServer(app.getHttpAdapter().getInstance());
}

export const handler: Handler = async (event: APIGatewayEvent, context: Context, callback: Callback) => {
  if(!cachedServer){
    cachedServer = await bootstrapServer();
  }
  return proxy(cachedServer, event, context, 'PROMISE').promise;
}

```

---

## Why Use `serverless-offline`?

The `serverless-offline` plugin allows you to emulate AWS Lambda locally, making it easier to develop and test your serverless applications without deploying to the cloud. This speeds up the development cycle and reduces costs associated with deploying multiple versions of your application. By running a local HTTP server, `serverless-offline` mimics the behavior of AWS API Gateway, providing an environment to test GraphQL queries and mutations seamlessly.

To learn more, visit the [serverless-offline documentation](https://www.serverless.com/plugins/serverless-offline).

---

## Step 5: Configure Serverless Framework

### Create `serverless.yml` File

In the root of your project, create a `serverless.yml` file:

```yaml
service: blog-management

provider:
  timeout: 30
  name: aws
  runtime: nodejs18.x
  region: us-east-1

functions:
  main:
    handler: dist/main.handler
    events:
      - http:
          path: management
          method: post

plugins:
  - serverless-offline

custom:
  serverless-offline:
    noPrependStageInUrl: true

package:
  exclude:
    - node_modules/**
  include:
    - dist/**
```



Build the project to generate the `dist` folder:

```bash
npm run build
```

---

## Step 6: Run and Test Locally

Use **serverless-offline** to emulate AWS Lambda locally.

### Start the Local Server:

```bash
npx serverless offline
```

This starts your application on `http://localhost:3000/management`.

#### Example Query:

```graphql
query {
  getAllPosts {
    id
    title
    content
  }
}
```

#### Example Mutation:

```graphql
mutation {
  createPost(title: "My First Post", content: "This is my first blog post!") {
    id
    title
    content
  }
}
```

Test these queries and mutations to ensure your API works as expected.



