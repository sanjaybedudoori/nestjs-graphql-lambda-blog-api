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