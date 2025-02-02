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