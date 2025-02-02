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