**Building a Serverless GraphQL API with NestJS and AWSLambda**

**NestJS and GraphQL are excellent tools for buildingmodern APIs. When combined with AWS Lambda, they create a powerful stack forserverless applications. NestJS provides a modular, TypeScript-based frameworkfor scalable server-side applications, GraphQL allows for precise and flexibledata fetching, and AWS Lambda enables serverless execution for cost-effectiveand scalable backend solutions. In this blog, we’ll focus on building andtesting a local GraphQL API with NestJS, using DynamoDB as the backend.**

**Introduction to NestJS**

**NestJS is a progressive Node.js framework that provides arobust and modular architecture for building server-side applications. Inspiredby Angular, it combines the best concepts from object-oriented programming,functional programming, and reactive programming. Its modular design andbuilt-in GraphQL support make it ideal for scalable applications. Learn more inthe** [**official NestJS documentation**](https://docs.nestjs.com/)**.**

**Why Choose GraphQL, DynamoDB, NestJS, and AWS Lambda?**

**Combining GraphQL, DynamoDB, NestJS, and AWS Lambdaprovides a powerful foundation for building APIs. GraphQL ensures efficientdata fetching, DynamoDB offers a fully managed NoSQL database, NestJS organizesthe application logic effectively, and AWS Lambda enables serverless execution,reducing infrastructure management.**

**Benefits of This Stack:**

2.  **Efficiency: GraphQL minimizes data transfer and optimizes client-server communication.**
    

4.  **Serverless Execution: AWS Lambda eliminates the need to manage servers, scaling automatically based on demand.**
    

6.  **High Availability: DynamoDB offers seamless scalability and low-latency performance.**
    

**Prerequisites**

2.  **Node.js installed on your machine.**
    

4.  **DynamoDB Local installed or Docker setup for local testing.**
    

6.  **Basic knowledge of TypeScript, GraphQL, and AWS services.**
    

**Set Up Dummy AWS Credentials**

**The AWS SDK requires credentials, even for local testing.Configure dummy credentials as follows:**

**aws configure**

**Use these dummy values:**

*   **Access Key ID: dummyAccessKeyId**
    

*   **Secret Access Key: dummySecretAccessKey**
    

*   **Default region: us-west-2 (or your preferred region)**
    

*   **Output format: json**
    

**These credentials are used only for local operations andwon't affect your real AWS account.**

**Install DynamoDB Local:**

**Using Docker:**

**docker run -d -p 8000:8000 amazon/dynamodb-local**

**Create a DynamoDB Table:**

**Run the following command using the AWS CLI:**

**aws dynamodb create-table \\**

    **--table-nameBlogPosts \\**

   **--attribute-definitions AttributeName=id,AttributeType=S \\**

    **--key-schemaAttributeName=id,KeyType=HASH \\**

    **--billing-modePAY\_PER\_REQUEST \\**

    **--endpoint-urlhttp://localhost:8000**

**This creates a table named BlogPosts with a primary key idof type string.**

**Step 2: Setting Up Your NestJS Application**

**The application we will build is a Blog Post ManagementSystem. This system allows users to create, retrieve, update, and delete blogposts using a GraphQL API.**

**Install the NestJS CLI:**

**npm i -g @nestjs/cli**

**Create a New Project:**

**nest new blog-management-api**

**cd blog-management-api**

**Choose npm as your preferred package manager whenprompted.**

**Add GraphQL, AWS SDK, and Other Dependencies:**

**npm install @nestjs/graphql @nestjs/apollo graphql-toolsgraphql @apollo/server aws-sdk aws-serverless-express**

**Add Serverless Framework Dependencies:**

**npm install --save-dev serverless serverless-offline**

**Step 3: Create Blog Module, Entity, Service, and Resolver**

**Define the BlogPost Entity:**

**Edit src/blog/entities/blog-post.entity.ts:**

**import { ObjectType, Field, ID } from '@nestjs/graphql';**

**@ObjectType()**

**export class BlogPost {**

  **@Field(() =>ID)**

  **id: string;**

  **@Field()**

  **title: string;**

  **@Field()**

  **content: string;**

**}**

**Implement the Blog Service:**

**Edit src/blog/blog.service.ts:**

**import { Injectable } from '@nestjs/common';**

**import { DynamoDB } from 'aws-sdk';**

**import { BlogPost } from './entities/blog-post.entity';**

**@Injectable()**

**export class BlogService {**

  **private readonlydynamoDb = new DynamoDB.DocumentClient({ endpoint: 'http://localhost:8000',region: 'us-west-2' });**

  **private readonlytableName = 'BlogPosts';**

  **async findAll():Promise {**

    **const result =await this.dynamoDb.scan({ TableName: this.tableName }).promise();**

    **returnresult.Items as BlogPost\[\];**

  **}**

  **asynccreate(title: string, content: string): Promise {**

    **const newPost:BlogPost = { id: Date.now().toString(), title, content };**

    **awaitthis.dynamoDb.put({ TableName: this.tableName, Item: newPost }).promise();**

    **return newPost;**

  **}**

**}**

**Implement the Blog Resolver:**

**Edit src/blog/blog.resolver.ts:**

**import { Resolver, Query, Mutation, Args } from'@nestjs/graphql';**

**import { BlogService } from './blog.service';**

**import { BlogPost } from './entities/blog-post.entity';**

**@Resolver(() => BlogPost)**

**export class BlogResolver {**

 **constructor(private readonly blogService: BlogService) {}**

  **@Query(() =>\[BlogPost\])**

  **getAllPosts():Promise {**

    **returnthis.blogService.findAll();**

  **}**

  **@Mutation(()=> BlogPost)**

 **createPost(@Args('title') title: string, @Args('content') content:string): Promise {**

    **returnthis.blogService.create(title, content);**

  **}**

**}**

**Step 4: Configure GraphQL Module**

**Update AppModule:**

**Edit src/app.module.ts to include the GraphQL moduleconfiguration:**

**import { Module } from '@nestjs/common';**

**import { GraphQLModule } from '@nestjs/graphql';**

**import { ApolloDriver, ApolloDriverConfig } from'@nestjs/apollo';**

**import { join } from 'path';**

**import { BlogModule } from './blog/blog.module';**

**@Module({**

  **imports: \[**

    **GraphQLModule.forRoot({**

      **driver:ApolloDriver,**

     **autoSchemaFile: join(process.cwd(), 'src/schema.gql'),**

    **}),**

    **BlogModule,**

  **\],**

**})**

**export class AppModule {}**

**This configuration generates the GraphQL schemaautomatically.**

**Why Use serverless-offline?**

**The serverless-offline plugin allows you to emulate AWSLambda locally, making it easier to develop and test your serverlessapplications without deploying to the cloud. This speeds up the developmentcycle and reduces costs associated with deploying multiple versions of yourapplication. By running a local HTTP server, serverless-offline mimics thebehavior of AWS API Gateway, providing an environment to test GraphQL queriesand mutations seamlessly.**

**To learn more, visit the** [**serverless-offlinedocumentation**](https://www.serverless.com/plugins/serverless-offline)**.**

**Step 5: Configure Serverless Framework**

**Create serverless.yml File**

**In the root of your project, create a serverless.ymlfile:**

**service: blog-management-api**

**provider:**

  **name: aws**

  **runtime:nodejs18.x**

  **region: us-west-2**

**functions:**

  **app:**

    **handler:dist/lambda.handler**

    **events:**

      **- http:**

          **path: graphql**

          **method:ANY**

      **- http:**

          **path:graphql/{proxy+}**

          **method:ANY**

**plugins:**

  **-serverless-offline**

**custom:**

 **serverless-offline:**

    **port: 4000**

**Update Main Application for AWS Lambda Compatibility**

**Edit src/main.ts:**

**import { NestFactory } from '@nestjs/core';**

**import { AppModule } from './app.module';**

**import { createServer, proxy } from'aws-serverless-express';**

**import { ExpressAdapter } from'@nestjs/platform-express';**

**import \* as express from 'express';**

**const binaryMimeTypes: string\[\] = \[\];**

**let cachedServer;**

**const bootstrapServer = async () => {**

  **const expressApp= express();**

  **const nestApp =await NestFactory.create(AppModule, new ExpressAdapter(expressApp));**

  **awaitnestApp.init();**

  **returncreateServer(expressApp, undefined, binaryMimeTypes);**

**};**

**export const handler = async (event, context) => {**

  **if(!cachedServer) {**

    **cachedServer =await bootstrapServer();**

  **}**

  **returnproxy(cachedServer, event, context, 'PROMISE').promise;**

**};**

**Build the project to generate the dist folder:**

**npm run build**

**Step 6: Run and Test Locally**

**Use serverless-offline to emulate AWS Lambda locally.**

**Start the Local Server:**

**npx serverless offline**

**This starts your application on http://localhost:4000/graphql.**

**Access the GraphQL Playground:**

**Navigate to http://localhost:4000/ in your browser.You’ll see the GraphQL Playground, where you can test your queries andmutations.**

**Example Query:**

**query {**

  **getAllPosts {**

    **id**

    **title**

    **content**

  **}**

**}**

**Example Mutation:**

**mutation {**

  **createPost(title:"My First Post", content: "This is my first blog post!") {**

    **id**

    **title**

    **content**

  **}**

**}**

**Test these queries and mutations to ensure your API worksas expected.**
